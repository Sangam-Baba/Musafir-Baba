// @ts-check
/**
 * Two-step login endpoints.
 * - POST /auth/mfa/verify {mfaToken, code | recoveryCode} → opens the session after the challenge.
 * - /me/mfa…, /me/step-up: the signed-in business user's own settings (requireBusinessUser).
 *   GET /me/mfa · POST /me/mfa/totp/setup · /me/mfa/totp/enable {code} · /me/mfa/totp/disable {proof}
 *   · /me/mfa/recovery-codes {proof} · /me/step-up {code | recoveryCode | password}
 */
import express from 'express';
import { z } from 'zod';

import { RateLimitError, UnauthorizedError } from '../../core/errors.js';
import { contextOf } from '../../core/http/context-middleware.js';
import { publicRoute, requireBusinessUser } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { clientIp } from '../../core/rate-limit.js';
import { verifyMfaChallenge } from './mfa-challenge.js';
import { requireAuthHeader, sendTokens } from './session-routes.js';

const Code = z.string().regex(/^\d{6}$/);
const Recovery = z.string().trim().min(10).max(20);
const Proof = z
  .strictObject({ code: Code.optional(), recoveryCode: Recovery.optional() })
  .refine((p) => Boolean(p.code) !== Boolean(p.recoveryCode), 'Give either code or recoveryCode');
const Verify = z
  .strictObject({ mfaToken: z.string().min(20).max(2000), code: Code.optional(), recoveryCode: Recovery.optional() })
  .refine((p) => Boolean(p.code) !== Boolean(p.recoveryCode), 'Give either code or recoveryCode');
const StepUp = z
  .strictObject({ code: Code.optional(), recoveryCode: Recovery.optional(), password: z.string().min(1).max(200).optional() })
  .refine((p) => [p.code, p.recoveryCode, p.password].filter(Boolean).length === 1, 'Give one of code, recoveryCode or password');

/**
 * @typedef {{
 *   mfa: ReturnType<typeof import('./mfa.service.js').createMfaService>,
 *   sessions: ReturnType<typeof import('./sessions.service.js').createSessionService>,
 *   users: ReturnType<typeof import('./users.repository.js').createUserRepository>,
 *   verifyLimiter: ReturnType<typeof import('../../core/rate-limit.js').createRateLimiter>,
 *   secret: string | undefined, clock: import('../../core/clock.js').Clock, secureCookies: boolean,
 *   defaultOrgFor?: (userId: string) => Promise<string | null> }} MfaRouteDeps
 */

/** @param {MfaRouteDeps} deps */
export function mfaAuthRoutes(deps) {
  const router = express.Router();
  router.post('/mfa/verify', publicRoute(), requireAuthHeader, validate({ body: Verify }), (req, res, next) => {
    const body = /** @type {z.infer<typeof Verify>} */ (res.locals.input.body);
    (async () => {
      const challenge = deps.secret ? verifyMfaChallenge(body.mfaToken, { secret: deps.secret, clock: deps.clock }) : null;
      if (!challenge) throw new UnauthorizedError('MFA_CHALLENGE_INVALID');
      const limit = await deps.verifyLimiter.consume(challenge.userId);
      if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);
      const method = await deps.mfa.verify(challenge.userId, { code: body.code, recoveryCode: body.recoveryCode });
      const methods = /** @type {import('./sessions.service.js').LoginMethod[]} */ ([...challenge.methods, method]);
      const orgId = (await deps.defaultOrgFor?.(challenge.userId)) ?? null;
      return deps.sessions.create({
        userId: challenge.userId,
        orgId,
        methods,
        ip: clientIp(req),
        userAgent: req.get('user-agent') ?? null,
      });
    })().then((tokens) => sendTokens(res, tokens, deps.secureCookies), next);
  });
  return router;
}

/** @param {import('express').Response} res */
function me(res) {
  const { actor } = contextOf(res);
  if ((actor.type !== 'user' && actor.type !== 'member') || !actor.sessionId) throw new UnauthorizedError();
  return { userId: actor.userId, sessionId: actor.sessionId };
}

/**
 * @param {import('express').RequestHandler} handler async-safe wrapper
 * @returns {import('express').RequestHandler}
 */
const run = (handler) => (req, res, next) => {
  Promise.resolve()
    .then(() => handler(req, res, next))
    .catch(next);
};

/** @param {MfaRouteDeps} deps */
export function mfaMeRoutes(deps) {
  const router = express.Router();
  router.use(requireBusinessUser());
  router.get(
    '/mfa',
    run(async (_req, res) => res.json(await deps.mfa.status(me(res).userId))),
  );
  router.post(
    '/mfa/totp/setup',
    run(async (_req, res) => {
      const { userId } = me(res);
      const user = await deps.users.findById(userId);
      res.json(await deps.mfa.setup(userId, user?.email ?? user?.phone ?? userId));
    }),
  );
  router.post(
    '/mfa/totp/enable',
    validate({ body: z.strictObject({ code: Code }) }),
    run(async (_req, res) => res.json(await deps.mfa.enable(me(res).userId, res.locals.input.body.code))),
  );
  router.post(
    '/mfa/totp/disable',
    validate({ body: Proof }),
    run(async (_req, res) => {
      await deps.mfa.disable(me(res).userId, res.locals.input.body);
      res.status(204).end();
    }),
  );
  router.post(
    '/mfa/recovery-codes',
    validate({ body: Proof }),
    run(async (_req, res) => res.json(await deps.mfa.regenerateRecoveryCodes(me(res).userId, res.locals.input.body))),
  );
  router.post(
    '/step-up',
    validate({ body: StepUp }),
    run(async (_req, res) => {
      const { userId, sessionId } = me(res);
      const body = /** @type {z.infer<typeof StepUp>} */ (res.locals.input.body);
      await proveItIsThem(deps, userId, body);
      res.json({ stepUpUntil: (await deps.sessions.markStepUp(sessionId, userId)).toISOString() });
    }),
  );
  return router;
}

/**
 * Step-up proof: with two-step login on, an app or recovery code is required; otherwise the password.
 * @param {MfaRouteDeps} deps @param {string} userId @param {{ code?: string, recoveryCode?: string, password?: string }} body
 */
async function proveItIsThem(deps, userId, body) {
  if (await deps.mfa.isEnabled(userId)) {
    if (body.password) throw new UnauthorizedError('MFA_CODE_REQUIRED');
    await deps.mfa.verify(userId, body);
    return;
  }
  if (!body.password) throw new UnauthorizedError('PASSWORD_REQUIRED');
  const user = await deps.users.findById(userId);
  const check = await deps.users.checkPassword(user?.email ?? user?.phone ?? '', body.password);
  if (!check.ok || check.user.id !== userId) throw new UnauthorizedError('PASSWORD_INVALID');
}
