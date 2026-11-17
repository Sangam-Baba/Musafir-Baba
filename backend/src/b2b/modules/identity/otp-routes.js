// @ts-check
/**
 * Email-code endpoints under /api/v1/auth (all need `X-B2B-Auth: 1`, strict bodies):
 * - POST /otp/request {email}               → 202 always (no account probing)
 * - POST /otp/verify {email, code}           → signed in (access token + refresh cookie)
 * - POST /password/forgot {email}            → 202 always
 * - POST /password/reset {email, code, newPassword} → 204; every session of the user is ended
 */
import express from 'express';
import { z } from 'zod';

import { publicRoute } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { clientIp } from '../../core/rate-limit.js';
import { assertPasswordAllowed, normaliseEmail } from './domain/user.js';
import { requireAuthHeader, sendTokens } from './session-routes.js';

const Email = z.strictObject({ email: z.string().trim().min(3).max(254) });
const Code = z.string().regex(/^\d{6}$/, 'The code has 6 digits');
const Verify = z.strictObject({ email: z.string().trim().min(3).max(254), code: Code });
const Reset = z.strictObject({ email: z.string().trim().min(3).max(254), code: Code, newPassword: z.string().min(1).max(200) });

/**
 * @param {{ otp: ReturnType<typeof import('./otp.service.js').createOtpService>,
 *   sessions: ReturnType<typeof import('./sessions.service.js').createSessionService>,
 *   users: ReturnType<typeof import('./users.repository.js').createUserRepository>, secureCookies: boolean,
 *   finish: ReturnType<typeof import('./sign-in.js').createSignIn>['finish'] }} options
 */
export function otpRoutes(options) {
  const router = express.Router();
  const accepted = (/** @type {import('express').Response} */ res) => res.status(202).json({ sent: true });

  router.post('/otp/request', publicRoute(), requireAuthHeader, validate({ body: Email }), (req, res, next) => {
    options.otp.request({ purpose: 'login', email: res.locals.input.body.email, ip: clientIp(req) }).then(() => accepted(res), next);
  });
  router.post('/otp/verify', publicRoute(), requireAuthHeader, validate({ body: Verify }), (req, res, next) => {
    const { email, code } = /** @type {z.infer<typeof Verify>} */ (res.locals.input.body);
    options.otp
      .verify({ purpose: 'login', email, code, ip: clientIp(req) })
      .then((user) =>
        options.sessions.create({ userId: user.id, methods: ['email-otp'], ip: clientIp(req), userAgent: req.get('user-agent') ?? null }),
      )
      .then((tokens) => sendTokens(res, tokens, options.secureCookies), next);
  });
  router.post('/password/forgot', publicRoute(), requireAuthHeader, validate({ body: Email }), (req, res, next) => {
    options.otp.request({ purpose: 'reset', email: res.locals.input.body.email, ip: clientIp(req) }).then(() => accepted(res), next);
  });
  router.post('/password/reset', publicRoute(), requireAuthHeader, validate({ body: Reset }), (req, res, next) => {
    const { email, code, newPassword } = /** @type {z.infer<typeof Reset>} */ (res.locals.input.body);
    Promise.resolve()
      .then(() => assertPasswordAllowed(newPassword, { email: normaliseEmail(email) })) // before the code is used up
      .then(() => options.otp.verify({ purpose: 'reset', email, code, ip: clientIp(req) }))
      .then(async (user) => {
        await options.users.setPassword(user.id, newPassword);
        await options.sessions.revokeAll(user.id, 'PASSWORD_RESET');
        res.status(204).end();
      })
      .catch(next);
  });
  return router;
}
