// @ts-check
/**
 * POST /api/v1/auth/login — email or phone + password → access token (body) + refresh cookie.
 * Needs the `X-B2B-Auth: 1` header (no cross-site login forms). Input is a strict zod object, so
 * `{"identifier": {"$gt": ""}}` and extra keys are refused before anything reaches the database.
 */
import express from 'express';
import { z } from 'zod';

import { publicRoute } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { clientIp } from '../../core/rate-limit.js';
import { requireAuthHeader, sendTokens } from './session-routes.js';

export const LoginBody = z.strictObject({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(200),
});

/** @param {{ login: ReturnType<typeof import('./login.service.js').createLoginService>, secureCookies: boolean }} options */
export function loginRoutes(options) {
  const router = express.Router();
  router.post('/login', publicRoute(), requireAuthHeader, validate({ body: LoginBody }), (req, res, next) => {
    const body = /** @type {z.infer<typeof LoginBody>} */ (res.locals.input.body);
    options.login
      .login({ ...body, ip: clientIp(req), userAgent: req.get('user-agent') ?? null })
      .then((tokens) => sendTokens(res, tokens, options.secureCookies), next);
  });
  return router;
}
