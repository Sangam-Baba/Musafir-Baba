// @ts-check
/**
 * Builds the identity module's pieces for /api/v1: the business-token authenticator, the /auth
 * router (login, email codes, two-step verify, refresh, logout) and the /me router (own two-step
 * settings, step-up). One place that knows the limits and which service needs which.
 */
import express from 'express';

import { createRateLimiter } from '../core/rate-limit.js';
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
  const { finish } = createSignIn({ sessions, mfa, secret, clock });
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
  const mfaDeps = { mfa, sessions, users, secret, clock, secureCookies, verifyLimiter: limiter('mfa-verify', 10, 15 * 60_000) };

  const auth = express.Router();
  auth.use(loginRoutes({ login, secureCookies }));
  auth.use(otpRoutes({ otp, sessions, users, secureCookies, finish }));
  auth.use(mfaAuthRoutes(mfaDeps));
  auth.use(sessionRoutes({ sessions, secureCookies }));

  return { authenticate: createBusinessAuthenticator({ secret, clock, sessions }), auth, me: mfaMeRoutes(mfaDeps) };
}
