// @ts-check
/**
 * Builds the identity module's pieces for /api/v1: the business-token authenticator, the /auth
 * router (login, email codes, two-step verify, refresh, logout) and the /me router (own two-step
 * settings, step-up). One place that knows the limits and which service needs which.
 */
import express from 'express';

import { createRateLimiter } from '../core/rate-limit.js';
import { resolveSystemRole, systemRole } from '../modules/access/index.js';
import { createOrganizationsService } from '../modules/organizations/index.js';
import { PERMISSION_CATALOGUE } from '../permission-catalogue.js';
import { accountRoutes } from './account.js';
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

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 */
export function createIdentity(env, clock) {
  const secret = env.B2B_AUTH_SECRET;
  const secureCookies = env.NODE_ENV === 'production';
  /** @param {string} name @param {number} points @param {number} windowMs */
  const limiter = (name, points, windowMs) => createRateLimiter({ name, points, windowMs, clock });

  const sessions = createSessionService({ secret, clock });
  const users = createUserRepository({ clock });
  const mfa = createMfaService({ secret, clock });
  const orgs = createOrganizationsService({ clock });
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
  const otp = createOtpService({
    users,
    secret,
    clock,
    limiters: {
      cooldown: limiter('otp-cooldown', 1, OTP_LIMITS.cooldownMs),
      daily: limiter('otp-daily', OTP_LIMITS.perDay, 24 * HOUR),
      ip: limiter('otp-ip', OTP_LIMITS.perIpPerHour, HOUR),
      verifyIp: limiter('otp-verify-ip', OTP_LIMITS.verifyPerIp, OTP_LIMITS.verifyWindowMs),
    },
  });
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

  const sign = (/** @type {import('../modules/identity/access-token.js').AccessClaims} */ claims) => {
    if (!secret) throw new Error('[b2b] B2B_AUTH_SECRET missing');
    return signAccessToken(claims, { secret, clock });
  };
  const resolveMember = (/** @type {string} */ orgId, /** @type {string} */ userId) => resolveMemberActor(orgs, orgId, userId);
  return {
    authenticate: createBusinessAuthenticator({ secret, clock, sessions, resolveMember }),
    auth,
    me: mfaMeRoutes(mfaDeps),
    account: accountRoutes({ users, mfa, sessions, orgs, sign }),
    orgs,
  };
}

/**
 * A member's permissions in the selected org: the union of their system roles of that org type
 * (custom roles join in S01-T10; a 60 s cache in S01-T11).
 * @param {ReturnType<typeof createOrganizationsService>} orgs @param {string} orgId @param {string} userId
 */
async function resolveMemberActor(orgs, orgId, userId) {
  const m = await orgs.usableMembership(orgId, userId);
  if (!m) return null;
  const permissions = new Set();
  for (const key of m.roles) {
    const role = systemRole(key);
    if (role && role.orgType === m.orgType) for (const code of resolveSystemRole(role, PERMISSION_CATALOGUE)) permissions.add(code);
  }
  return {
    orgId,
    orgType: m.orgType,
    permissions: [...permissions].sort(),
    branchIds: m.branchIds,
    propertyIds: m.propertyIds,
    ownOnly: m.ownOnly,
  };
}
