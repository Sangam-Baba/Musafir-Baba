// @ts-check
/**
 * Builds the identity module's pieces for /api/v1: the business-token authenticator, the /auth
 * router (login, email codes, two-step verify, refresh, logout) and the /me router (own two-step
 * settings, step-up). One place that knows the limits and which service needs which.
 */
import express from 'express';

import { createRateLimiter } from '../core/rate-limit.js';
import { createOrganizationsService } from '../modules/organizations/index.js';
import { memberCacheKey } from './access-cache.js';
import { accountRoutes } from './account.js';
import { createLegacyAuthenticator } from './legacy-auth.js';
import {
  createBusinessAuthenticator,
  createLoginService,
  createMfaService,
  createOtpService,
  createSessionService,
  createSignIn,
  createUserRepository,
  LOGIN_LIMITS,
  loginRoutes,
  mfaAuthRoutes,
  mfaMeRoutes,
  OTP_LIMITS,
  otpRoutes,
  sessionRoutes,
  signAccessToken,
} from '../modules/identity/index.js';

const HOUR = 60 * 60_000;

/** @typedef {(roles: readonly string[], orgType: 'PLATFORM' | 'CLIENT' | 'HOTEL' | 'BUS_OPERATOR', orgId: string) => Promise<string[]>} PermissionsOf */

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {PermissionsOf} permissionsOf what a member's roles allow (system + custom roles)
 * @param {ReturnType<typeof import('./access-cache.js').createMemberCache>} memberCache
 */
export function createIdentity(env, clock, permissionsOf, memberCache) {
  const secret = env.B2B_AUTH_SECRET;
  const secureCookies = env.NODE_ENV === 'production';
  /** @param {string} name @param {number} points @param {number} windowMs */
  const limiter = (name, points, windowMs) => createRateLimiter({ name, points, windowMs, clock });

  const sessions = createSessionService({ secret, clock });
  const users = createUserRepository({ clock });
  const mfa = createMfaService({ secret, clock });
  const orgs = createOrganizationsService({ clock, describeUsers: (ids) => users.describe(ids) });
  const defaultOrgFor = (/** @type {string} */ userId) => orgs.defaultOrgFor(userId);
  const { finish } = createSignIn({ sessions, mfa, secret, clock, defaultOrgFor });
  const login = createLoginService({
    users,
    sessions,
    finish,
    clock,
    limiters: {
      ip: limiter('login-ip', LOGIN_LIMITS.perIp, LOGIN_LIMITS.windowMs),
      account: limiter('login-account', LOGIN_LIMITS.perAccount, LOGIN_LIMITS.windowMs),
      failures: limiter('login-failures', 1000, LOGIN_LIMITS.windowMs),
    },
  });
  const otp = createOtpService({ users, secret, clock, limiters: otpLimiters(limiter) });
  const mfaDeps = {
    mfa,
    sessions,
    users,
    secret,
    clock,
    secureCookies,
    defaultOrgFor,
    verifyLimiter: limiter('mfa-verify', 10, 15 * 60_000),
  };

  const auth = express.Router();
  auth.use(loginRoutes({ login, secureCookies }));
  auth.use(otpRoutes({ otp, sessions, users, secureCookies, finish }));
  auth.use(mfaAuthRoutes(mfaDeps));
  auth.use(sessionRoutes({ sessions, secureCookies }));

  const sign = signer(secret, clock);
  const resolveMember = async (/** @type {string} */ orgId, /** @type {string} */ userId) => {
    const key = memberCacheKey(orgId, userId);
    const cached = memberCache.get(key);
    if (cached) return cached;
    const member = await resolveMemberActor(orgs, permissionsOf, orgId, userId);
    if (member) memberCache.set(key, member); // misses are not cached
    return member;
  };
  return {
    businessAuthenticate: createBusinessAuthenticator({ secret, clock, sessions, resolveMember }),
    resolveMember, // Stage 14: API keys act as the member who created them
    legacyAuthenticate: createLegacyAuthenticator({ secret: env.JWT_ACCESS_SECRET }),
    mfa,
    auth,
    me: mfaMeRoutes(mfaDeps),
    account: accountRoutes({ users, mfa, sessions, orgs, sign }),
    orgs,
    users,
    sessions,
    secureCookies,
  };
}

/**
 * Rate limits of the email-code endpoints.
 * @param {(name: string, points: number, windowMs: number) => ReturnType<typeof createRateLimiter>} limiter
 */
const otpLimiters = (limiter) => ({
  cooldown: limiter('otp-cooldown', 1, OTP_LIMITS.cooldownMs),
  daily: limiter('otp-daily', OTP_LIMITS.perDay, 24 * HOUR),
  ip: limiter('otp-ip', OTP_LIMITS.perIpPerHour, HOUR),
  verifyIp: limiter('otp-verify-ip', OTP_LIMITS.verifyPerIp, OTP_LIMITS.verifyWindowMs),
});

/**
 * Signs access tokens for the org switcher.
 * @param {string | undefined} secret @param {import('../core/clock.js').Clock} clock
 */
const signer = (secret, clock) => (/** @type {import('../modules/identity/access-token.js').AccessClaims} */ claims) => {
  if (!secret) throw new Error('[b2b] B2B_AUTH_SECRET missing');
  return signAccessToken(claims, { secret, clock });
};

/**
 * A member's permissions in the selected org (custom roles join in S01-T10; a 60 s cache in S01-T11).
 * @param {ReturnType<typeof createOrganizationsService>} orgs @param {PermissionsOf} permissionsOf @param {string} orgId @param {string} userId
 */
async function resolveMemberActor(orgs, permissionsOf, orgId, userId) {
  const m = await orgs.usableMembership(orgId, userId);
  if (!m) return null;
  return {
    orgId,
    orgType: m.orgType,
    roles: m.roles,
    permissions: await permissionsOf(m.roles, m.orgType, orgId),
    branchIds: m.branchIds,
    propertyIds: m.propertyIds,
    ownOnly: m.ownOnly,
  };
}
