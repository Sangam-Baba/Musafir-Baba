// @ts-check
/**
 * MusafirBaba's KYC review endpoints (plan Stage 02 §3.6, §3.9). Reading needs `platform.kyc.read`;
 * taking, verdicts, decisions and opening the full PAN / bank number need `platform.kyc.review`;
 * the final approval of a high-risk application also needs `platform.kyc.approve` (checked in the service).
 * GET  /admin/kyc-applications?status=&orgType=&risk=high|normal
 * GET  /admin/kyc-applications/:id
 * POST /admin/kyc-applications/:id/assign            — take it (30-minute lock) or renew your lock
 * POST /admin/kyc-applications/:id/release
 * PUT  /admin/kyc-applications/:id/documents/:key    — {verdict, note}
 * POST /admin/kyc-applications/:id/decision          — {decision: APPROVE | REJECT, note}
 * POST /admin/kyc-applications/:id/sensitive         — full PAN and account number (every view recorded)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { findStaffById } from '../legacy-read/index.js';
import { APPLICATION_STATUSES, PERMISSIONS as KYC } from '../modules/kyc/index.js';

const Params = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const DocParams = Params.extend({ key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/) });
const Note = z.string().trim().min(1).max(2000).nullish();
const QueueQuery = z.strictObject({
  status: z.enum(APPLICATION_STATUSES).optional(),
  orgType: z.enum(['CLIENT', 'HOTEL']).optional(),
  risk: z.enum(['high', 'normal']).optional(),
});

/** @param {import('express').Response} res */
function reviewerOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId, permissions: actor.permissions ?? [] };
}

/**
 * Whether the staff member also belongs to the organisation (same email as one of its business users).
 * @param {{ users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   orgs: ReturnType<typeof import('../modules/organizations/index.js').createOrganizationsService> }} deps
 */
export function ownOrgCheck(deps) {
  return async (/** @type {string} */ staffId, /** @type {string} */ orgId) => {
    const staff = await findStaffById(staffId);
    const user = staff?.email ? await deps.users.findByLogin(staff.email) : null;
    if (!user) return false;
    return (await deps.orgs.membershipsOf(user.id)).some((m) => m.orgId === orgId);
  };
}

/** @param {(res: import('express').Response) => Promise<unknown>} fn @returns {import('express').RequestHandler} */
const handle = (fn) => (_req, res, next) => {
  Promise.resolve()
    .then(() => fn(res))
    .then((body) => res.json(body), next);
};

/** @typedef {Parameters<typeof kycAdminRoutes>[0]} KycAdminDeps */

/**
 * @param {{ review: ReturnType<typeof import('../modules/kyc/index.js').createKycReviewService>,
 *   kyc: ReturnType<typeof import('../modules/kyc/index.js').createKycService> }} deps
 */
export function kycAdminRoutes(deps) {
  const router = express.Router();
  const read = requirePermission(KYC.platformRead);
  const review = requirePermission(KYC.platformReview);

  router.get(
    '/admin/kyc-applications',
    read,
    validate({ query: QueueQuery }),
    handle(async (res) => {
      const q = res.locals.input.query;
      const highRisk = q.risk ? q.risk === 'high' : undefined;
      return { data: await deps.review.queue({ status: q.status ? [q.status] : undefined, orgType: q.orgType, highRisk }) };
    }),
  );
  router.get(
    '/admin/kyc-applications/:id',
    read,
    validate({ params: Params }),
    handle((res) => deps.review.get(res.locals.input.params.id)),
  );
  router.post(
    '/admin/kyc-applications/:id/assign',
    review,
    validate({ params: Params }),
    handle((res) => deps.review.take(reviewerOf(res), res.locals.input.params.id)),
  );
  router.post(
    '/admin/kyc-applications/:id/release',
    review,
    validate({ params: Params }),
    handle((res) => deps.review.release(reviewerOf(res), res.locals.input.params.id)),
  );
  router.put(
    '/admin/kyc-applications/:id/documents/:key',
    review,
    validate({ params: DocParams, body: z.strictObject({ verdict: z.enum(['VERIFIED', 'MISMATCH', 'UNREADABLE']), note: Note }) }),
    handle((res) => {
      const { params, body } = res.locals.input;
      return deps.review.setVerdict(reviewerOf(res), params.id, { key: params.key, verdict: body.verdict, note: body.note ?? null });
    }),
  );
  router.post(
    '/admin/kyc-applications/:id/decision',
    review,
    validate({ params: Params, body: z.strictObject({ decision: z.enum(['APPROVE', 'REJECT']), note: Note }) }),
    handle((res) => {
      const { params, body } = res.locals.input;
      return deps.review.decide(reviewerOf(res), params.id, { decision: body.decision, note: body.note ?? null });
    }),
  );
  router.use(sensitiveRoute(deps));
  return router;
}

/** @param {KycAdminDeps} deps */
function sensitiveRoute(deps) {
  const router = express.Router();
  router.post(
    '/admin/kyc-applications/:id/sensitive',
    requirePermission(KYC.platformReview),
    validate({ params: Params }),
    handle(async (res) => {
      const who = reviewerOf(res);
      const application = await deps.review.get(res.locals.input.params.id);
      return deps.kyc.revealSensitive(application.orgId, `staff:${who.staffId}`);
    }),
  );
  return router;
}
