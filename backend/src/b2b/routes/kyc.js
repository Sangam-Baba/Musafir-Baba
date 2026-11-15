// @ts-check
/**
 * The hotel's own KYC application (plan Stage 02 §3.3, §3.5) — needs identity (email verified) and files,
 * so it is wired in the routes layer.
 * GET    /kyc                  — the application, its document list and what is missing (`kyc.application.read`)
 * PUT    /kyc                  — change the business details (`kyc.application.submit`; DRAFT or REJECTED only)
 * PUT    /kyc/documents/:key   — attach an uploaded file {fileId} as one document (replaces an earlier one)
 * DELETE /kyc/documents/:key   — remove a document
 * POST   /kyc/submit           — submit / resubmit; repeat-safe; needs a verified email and every required document
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as KYC, validateHotelDetails } from '../modules/kyc/index.js';
import { HotelDetailsBody } from './registrations.js';

const DocumentKey = z.strictObject({ key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/) });

/**
 * @param {{ kyc: ReturnType<typeof import('../modules/kyc/index.js').createKycService>,
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository> }} deps
 */
export function kycRoutes(deps) {
  const router = express.Router();
  const submit = requirePermission(KYC.applicationSubmit);

  router.get('/kyc', requirePermission(KYC.applicationRead), (_req, res, next) => {
    deps.kyc.mine(contextOf(res)).then((a) => res.json(a), next);
  });

  router.put('/kyc', submit, validate({ body: z.strictObject({ details: HotelDetailsBody }) }), (_req, res, next) => {
    const details = validateHotelDetails(res.locals.input.body.details);
    deps.kyc.saveDetails(contextOf(res), details).then((a) => res.json(a), next);
  });

  router.put(
    '/kyc/documents/:key',
    submit,
    validate({ params: DocumentKey, body: z.strictObject({ fileId: z.string().min(1).max(64) }) }),
    (_req, res, next) => {
      const { params, body } = res.locals.input;
      deps.kyc.attachDocument(contextOf(res), { key: params.key, fileId: body.fileId }).then((a) => res.json(a), next);
    },
  );

  router.delete('/kyc/documents/:key', submit, validate({ params: DocumentKey }), (_req, res, next) => {
    deps.kyc.detachDocument(contextOf(res), res.locals.input.params.key).then((a) => res.json(a), next);
  });

  router.post('/kyc/submit', submit, validate({ body: z.strictObject({}) }), (_req, res, next) => {
    (async () => {
      const ctx = contextOf(res);
      const userId = ctx.actor.type === 'member' ? ctx.actor.userId : '';
      const user = await deps.users.findById(userId);
      res.json(await deps.kyc.submit(ctx, { emailVerified: Boolean(user?.emailVerified) }));
    })().catch(next);
  });
  return router;
}
