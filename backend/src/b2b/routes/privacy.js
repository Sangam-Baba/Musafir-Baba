// @ts-check
/**
 * Stage 16 data protection (DPDP):
 *   POST /privacy/consents  public — record that someone agreed to a notice (website checkout, business registration)
 *   POST /privacy/requests  public — ask for a copy, correction or deletion of one's data (answered within 30 days)
 *   GET  /admin/privacy/requests?status · POST /admin/privacy/requests/:id/resolve {done, note}   (`platform.privacy.manage`)
 * Public routes are limited per address (consents 30 / hour, requests 5 / hour).
 */
import express from 'express';
import { z } from 'zod';

import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp, createRateLimiter } from '../core/rate-limit.js';
import { RateLimitError } from '../core/errors.js';
import { CONSENT_PURPOSES, createPrivacy, DATA_REQUEST_TYPES, PERMISSIONS as ID } from '../modules/identity/index.js';
import { handle, staffOf } from './payout-finance-admin.js';

/** @param {{ clock: import('../core/clock.js').Clock }} deps */
export function privacyRoutes(deps) {
  const router = express.Router();
  const privacy = createPrivacy(deps);
  const consents = createRateLimiter({ name: 'privacy-consent', points: 30, windowMs: 60 * 60_000, clock: deps.clock });
  const requests = createRateLimiter({ name: 'privacy-request', points: 5, windowMs: 60 * 60_000, clock: deps.clock });
  /** @param {ReturnType<typeof createRateLimiter>} limiter @returns {import('express').RequestHandler} */
  const limit = (limiter) => (req, _res, next) => {
    limiter.consume(clientIp(req)).then((r) => next(r.allowed ? undefined : new RateLimitError(r.retryAfterSeconds)), next);
  };
  const input = (/** @type {import('express').Response} */ res) => /** @type {{ body: any, query: any, params: any }} */ (res.locals.input);
  router.post(
    '/privacy/consents',
    publicRoute(),
    limit(consents),
    validate({
      body: z.strictObject({
        purpose: z.enum(CONSENT_PURPOSES),
        noticeVersion: z.string().trim().min(1).max(20),
        subjectRef: z.string().trim().max(60).nullish(),
      }),
    }),
    handle(
      async (req, res) => privacy.recordConsent({ ...input(res).body, subjectRef: input(res).body.subjectRef ?? null, ip: clientIp(req) }),
      201,
    ),
  );
  router.post(
    '/privacy/requests',
    publicRoute(),
    limit(requests),
    validate({
      body: z.strictObject({
        type: z.enum(DATA_REQUEST_TYPES),
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().email().max(254),
        phone: z.string().trim().max(20).nullish(),
        details: z.string().trim().max(2000).nullish(),
      }),
    }),
    handle(async (_q, res) => privacy.request(input(res).body), 201),
  );
  router.get(
    '/admin/privacy/requests',
    requirePermission(ID.privacyManage),
    validate({ query: z.strictObject({ status: z.enum(['OPEN', 'DONE', 'REJECTED']).optional() }) }),
    handle(async (_q, res) => ({ data: await privacy.list(input(res).query) })),
  );
  router.post(
    '/admin/privacy/requests/:id/resolve',
    requirePermission(ID.privacyManage),
    validate({
      params: z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) }),
      body: z.strictObject({ done: z.boolean(), note: z.string().trim().min(3).max(2000) }),
    }),
    handle(async (_q, res) => privacy.resolve(staffOf(res), input(res).params.id, input(res).body)),
  );
  return router;
}
