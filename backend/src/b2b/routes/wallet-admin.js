// @ts-check
/**
 * MusafirBaba admin: client wallets (plan Stage 11 §3.5–3.6, §3.9).
 *   GET  /admin/wallet/manual-top-ups?status&clientOrgId (`wallet.topup.check`)
 *   POST /admin/wallet/manual-top-ups/:id/check   (`wallet.topup.check`)   {ok, note} — matched against the bank
 *   POST /admin/wallet/manual-top-ups/:id/decide  (`wallet.topup.approve`) {approve, note} — a different person
 *   GET  /admin/wallet/credit-lines?status&clientOrgId (`wallet.credit.propose`) · GET /admin/wallet/credit-overdue (same)
 *   POST /admin/wallet/credit-lines               (`wallet.credit.propose`) {clientOrgId, limitPaise, dueDays, note}
 *   POST /admin/wallet/credit-lines/:id/decide    (`wallet.credit.approve`) {approve, note} — a different person
 *   GET  /admin/wallet/adjustments?clientOrgId    (`wallet.adjustment.propose`)
 *   POST /admin/wallet/adjustments                (`wallet.adjustment.propose`) {clientOrgId, amountPaise ±, counterType, reasonCode, note}
 *   POST /admin/wallet/adjustments/:id/decide     (`wallet.adjustment.approve`) {approve, note} — a different person
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import {
  CREDIT_LIMIT_MAX_PAISE,
  CREDIT_LINE_STATUSES,
  MANUAL_TOPUP_STATUSES,
  PERMISSIONS as WAL,
  PLATFORM_ACCOUNT_TYPES,
  REASON_CODES,
} from '../modules/wallet/index.js';

const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const OrgId = z.string().regex(/^[a-f0-9]{24}$/);
const Note = z.string().trim().max(500).nullish();

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} fn */
const handle = (fn) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((body) => res.set('Cache-Control', 'private, no-store').json(body), next);
    }
  );

/**
 * @param {{ manualTopUps: ReturnType<typeof import('../modules/wallet/index.js').createManualTopUps>,
 *   creditLines: ReturnType<typeof import('../modules/wallet/index.js').createCreditLines>,
 *   adjustments: ReturnType<typeof import('../modules/wallet/index.js').createWalletAdjustments> }} deps
 */
export function walletAdminRoutes(deps) {
  const router = express.Router();
  router.get(
    '/admin/wallet/manual-top-ups',
    requirePermission(WAL.topUpCheck),
    validate({ query: z.strictObject({ status: z.enum(MANUAL_TOPUP_STATUSES).optional(), clientOrgId: OrgId.optional() }) }),
    handle(async (_q, res) => ({ data: await deps.manualTopUps.list(res.locals.input.query) })),
  );
  router.post(
    '/admin/wallet/manual-top-ups/:id/check',
    requirePermission(WAL.topUpCheck),
    validate({ params: Id, body: z.strictObject({ ok: z.boolean(), note: Note }) }),
    handle(async (_q, res) => deps.manualTopUps.check(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  router.post(
    '/admin/wallet/manual-top-ups/:id/decide',
    requirePermission(WAL.topUpApprove),
    validate({ params: Id, body: z.strictObject({ approve: z.boolean(), note: Note }) }),
    handle(async (_q, res) => deps.manualTopUps.decide(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  creditRoutes(router, deps);
  adjustmentRoutes(router, deps);
  return router;
}

/** @param {import('express').Router} router @param {Parameters<typeof walletAdminRoutes>[0]} deps */
function creditRoutes(router, deps) {
  const propose = requirePermission(WAL.creditPropose);
  router.get(
    '/admin/wallet/credit-lines',
    propose,
    validate({ query: z.strictObject({ status: z.enum(CREDIT_LINE_STATUSES).optional(), clientOrgId: OrgId.optional() }) }),
    handle(async (_q, res) => ({ data: await deps.creditLines.list(res.locals.input.query) })),
  );
  router.get(
    '/admin/wallet/credit-overdue',
    propose,
    handle(async () => ({ data: await deps.creditLines.overdue() })),
  );
  router.post(
    '/admin/wallet/credit-lines',
    propose,
    validate({
      body: z.strictObject({
        clientOrgId: OrgId,
        limitPaise: z.number().int().min(0).max(CREDIT_LIMIT_MAX_PAISE),
        dueDays: z.number().int().min(1).max(90),
        note: Note,
      }),
    }),
    handle(async (_q, res) => deps.creditLines.propose(staff(res), res.locals.input.body)),
  );
  router.post(
    '/admin/wallet/credit-lines/:id/decide',
    requirePermission(WAL.creditApprove),
    validate({ params: Id, body: z.strictObject({ approve: z.boolean(), note: Note }) }),
    handle(async (_q, res) => deps.creditLines.decide(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
}

/** @param {import('express').Router} router @param {Parameters<typeof walletAdminRoutes>[0]} deps */
function adjustmentRoutes(router, deps) {
  const propose = requirePermission(WAL.adjustmentPropose);
  router.get(
    '/admin/wallet/adjustments',
    propose,
    validate({ query: z.strictObject({ clientOrgId: OrgId.optional() }) }),
    handle(async (_q, res) => ({ data: await deps.adjustments.list(res.locals.input.query) })),
  );
  router.post(
    '/admin/wallet/adjustments',
    propose,
    validate({
      body: z.strictObject({
        clientOrgId: OrgId,
        amountPaise: z
          .number()
          .int()
          .min(-CREDIT_LIMIT_MAX_PAISE)
          .max(CREDIT_LIMIT_MAX_PAISE)
          .refine((v) => v !== 0),
        counterType: z.enum(/** @type {[string, ...string[]]} */ ([...PLATFORM_ACCOUNT_TYPES])),
        reasonCode: z.enum(REASON_CODES),
        note: z.string().trim().min(5).max(500),
      }),
    }),
    handle(async (_q, res) => deps.adjustments.propose(staff(res), res.locals.input.body)),
  );
  router.post(
    '/admin/wallet/adjustments/:id/decide',
    requirePermission(WAL.adjustmentApprove),
    validate({ params: Id, body: z.strictObject({ approve: z.boolean(), note: Note }) }),
    handle(async (_q, res) => deps.adjustments.decide(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
}
