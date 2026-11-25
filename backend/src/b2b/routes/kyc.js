// @ts-check
/**
 * The hotel's own KYC application (plan Stage 02 §3.3, §3.5) — needs identity (email verified) and files,
 * so it is wired in the routes layer.
 * GET    /kyc                  — the application, its document list and what is missing (`kyc.application.read`);
 *                                 an onboarding hotel without one gets an empty draft
 * PUT    /kyc                  — change the business details (`kyc.application.submit`; DRAFT or REJECTED only)
 * PUT    /kyc/bank             — the payout bank account {holderName, accountNumber, ifsc}; the number is stored encrypted
 * PUT    /kyc/documents/:key   — attach an uploaded file {fileId} as one document (replaces an earlier one)
 * DELETE /kyc/documents/:key   — remove a document
 * POST   /kyc/gst-registrations — a further GSTIN of the same business (another state) {gstin, fileId: its certificate}
 * DELETE /kyc/gst-registrations/:id — remove one not verified yet
 * POST   /kyc/submit           — submit / resubmit; repeat-safe; needs a verified email and every required document
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import {
  PERMISSIONS as KYC,
  validateBankDetails,
  validateClientDetails,
  validateHotelDetails,
  validateOperatorDetails,
} from '../modules/kyc/index.js';
import { ClientDetailsBody, HotelDetailsBody, OperatorDetailsBody } from './registrations.js';

const BankBody = z.strictObject({
  holderName: z.string().max(200),
  accountNumber: z.string().max(40),
  ifsc: z.string().max(20),
});
const DocumentKey = z.strictObject({ key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/) });

/**
 * @typedef {{ kyc: ReturnType<typeof import('../modules/kyc/index.js').createKycService>,
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   orgs?: { basicInfo: (orgId: string) => Promise<{ type: string, status: string } | null> },
 *   gst?: ReturnType<typeof import('../modules/kyc/index.js').createGstRegistrations> }} KycRouteDeps
 */

/**
 * The application, or — for a hotel or client still onboarding that has none (registration interrupted after the
 * org was created, or an org created by an admin) — a new empty draft of its own type. Active orgs never get one here, so
 * they are never reminded or cleaned up.
 * @param {KycRouteDeps} deps
 * @param {import('../core/context.js').RequestContext} ctx
 */
async function mineOrStart(deps, ctx) {
  try {
    return await deps.kyc.mine(ctx);
  } catch (error) {
    const a = ctx.actor;
    if (/** @type {{ code?: string }} */ (error).code !== 'KYC_APPLICATION_NOT_FOUND' || a.type !== 'member' || !deps.orgs) throw error;
    const org = await deps.orgs.basicInfo(a.orgId);
    if (!['HOTEL', 'CLIENT', 'BUS_OPERATOR'].includes(String(org?.type)) || org?.status !== 'ONBOARDING') throw error;
    const orgType = /** @type {'CLIENT' | 'HOTEL' | 'BUS_OPERATOR'} */ (org?.type);
    await deps.kyc.ensureApplication({ orgId: a.orgId, orgType, createdBy: a.userId, details: null });
    return deps.kyc.mine(ctx);
  }
}

/**
 * `PUT /kyc` details: the form follows the organisation's type (clients have no property count); hotels as before.
 * @param {KycRouteDeps} deps
 * @returns {import('express').RequestHandler[]}
 */
function detailsHandlers(deps) {
  /** The details form and checks follow the organisation's type (Stage 18: bus operators give a fleet size). */
  const kindOf = (/** @type {import('express').Response} */ res) => {
    const { actor } = contextOf(res);
    const t = actor.type === 'member' ? actor.orgType : undefined;
    return t === 'CLIENT' || t === 'BUS_OPERATOR' ? t : 'HOTEL';
  };
  const bodies = {
    HOTEL: validate({ body: z.strictObject({ details: HotelDetailsBody }) }),
    CLIENT: validate({ body: z.strictObject({ details: ClientDetailsBody }) }),
    BUS_OPERATOR: validate({ body: z.strictObject({ details: OperatorDetailsBody }) }),
  };
  const checks = { HOTEL: validateHotelDetails, CLIENT: validateClientDetails, BUS_OPERATOR: validateOperatorDetails };
  return [
    (req, res, next) => bodies[kindOf(res)](req, res, next),
    (_req, res, next) => {
      const details = checks[kindOf(res)](res.locals.input.body.details);
      deps.kyc.saveDetails(contextOf(res), details).then((a) => res.json(a), next);
    },
  ];
}

/** @param {KycRouteDeps} deps */
export function kycRoutes(deps) {
  const router = express.Router();
  const submit = requirePermission(KYC.applicationSubmit);

  router.get('/kyc', requirePermission(KYC.applicationRead), (_req, res, next) => {
    mineOrStart(deps, contextOf(res)).then((a) => res.json(a), next);
  });

  router.put('/kyc', submit, ...detailsHandlers(deps));

  router.put('/kyc/bank', submit, validate({ body: BankBody }), (_req, res, next) => {
    const bank = validateBankDetails(res.locals.input.body);
    deps.kyc.saveBank(contextOf(res), bank).then((a) => res.json(a), next);
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

  router.post(
    '/kyc/gst-registrations',
    submit,
    validate({ body: z.strictObject({ gstin: z.string().trim().min(15).max(20), fileId: z.string().min(1).max(64) }) }),
    (_req, res, next) => {
      const gst = deps.gst;
      if (!gst) return next(new Error('[b2b] GST registrations not wired'));
      gst.add(contextOf(res), res.locals.input.body).then(() => deps.kyc.mine(contextOf(res)).then((a) => res.status(201).json(a)), next);
    },
  );
  router.delete(
    '/kyc/gst-registrations/:id',
    submit,
    validate({ params: z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) }) }),
    (_req, res, next) => {
      const gst = deps.gst;
      if (!gst) return next(new Error('[b2b] GST registrations not wired'));
      gst.remove(contextOf(res), res.locals.input.params.id).then(() => deps.kyc.mine(contextOf(res)).then((a) => res.json(a)), next);
    },
  );

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
