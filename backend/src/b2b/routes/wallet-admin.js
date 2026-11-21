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
 *   GET  /admin/wallet/clients                    (`wallet.ledger.read`) every client wallet: balance, held, credit, overdue
 *   GET  /admin/wallet/clients/:orgId/statement?from&to (`wallet.ledger.read`)
 *   GET  /admin/wallet/manual-credits?date        (`wallet.ledger.read`) the day's money added by hand (bank transfers
 *        approved, wallet adjustments posted) — the daily manual-credits report
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
  walletStatement,
} from '../modules/wallet/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';
import { AccountRecord, AdjustmentRecord, availableOf, creditState, ManualTopUpRecord } from '../modules/wallet/index.js';

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
 *   adjustments: ReturnType<typeof import('../modules/wallet/index.js').createWalletAdjustments>,
 *   clock: import('../core/clock.js').Clock }} deps
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
  explorerRoutes(router, deps);
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

const SYS = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'wallet: admin explorer' };
const IST_MS = 330 * 60_000;
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Every client wallet with its company's name. @param {Date} now */
async function clientWallets(now) {
  const rows = await AccountRecord.find({ type: 'WALLET' }).setOptions(SYS).limit(2000).lean();
  const orgs = await OrganizationRecord.find(
    { _id: { $in: rows.map((a) => a.ownerOrgId) } },
    { legalName: 1, displayName: 1, reference: 1 },
  )
    .setOptions(SYS)
    .lean();
  const name = new Map(orgs.map((o) => [String(o._id), o]));
  return rows
    .map((a) => {
      const w = { balancePaise: a.balancePaise ?? 0, heldPaise: a.heldPaise ?? 0, creditLimitPaise: a.creditLimitPaise ?? 0 };
      const c = creditState({ ...w, creditDueDays: a.creditDueDays ?? 0, negativeSince: a.negativeSince ?? null }, now);
      const o = /** @type {any} */ (name.get(String(a.ownerOrgId)));
      return {
        clientOrgId: a.ownerOrgId,
        name: o?.displayName ?? o?.legalName ?? a.ownerOrgId,
        reference: o?.reference ?? null,
        ...w,
        availablePaise: availableOf(w),
        creditUsedPaise: c.usedPaise,
        creditDueAt: c.dueAt,
        overdue: c.overdue,
        pendingOps: (a.ops ?? []).length,
      };
    })
    .sort((x, y) => Number(y.overdue) - Number(x.overdue) || y.creditUsedPaise - x.creditUsedPaise || y.balancePaise - x.balancePaise);
}

/** The day's manual credits (Indian date). @param {string} day */
async function manualCredits(day) {
  const start = new Date(Date.parse(`${day}T00:00:00Z`) - IST_MS);
  const end = new Date(start.getTime() + 86_400_000);
  const topUps = await ManualTopUpRecord.find({ status: 'APPROVED', decidedAt: { $gte: start, $lt: end } })
    .setOptions(SYS)
    .lean();
  const adjustments = await AdjustmentRecord.find({ kind: 'WALLET', status: 'POSTED', decidedAt: { $gte: start, $lt: end } }).lean();
  const rows = [
    ...topUps.map((t) => ({
      kind: 'BANK_TRANSFER',
      id: String(t._id),
      ref: t.ref,
      clientOrgId: t.clientOrgId,
      amountPaise: t.amountPaise,
      detail: `${t.method} UTR ${t.utr} (${t.paidOn})`,
      checkedBy: t.checkedBy,
      approvedBy: t.decidedBy,
      at: t.decidedAt,
    })),
    ...adjustments.map((a) => ({
      kind: 'ADJUSTMENT',
      id: String(a._id),
      ref: a.reasonCode,
      clientOrgId: a.clientOrgId,
      amountPaise: a.amountPaise ?? 0,
      detail: a.note,
      checkedBy: a.proposedBy,
      approvedBy: a.decidedBy,
      at: a.decidedAt,
    })),
  ].sort((x, y) => new Date(x.at ?? 0).getTime() - new Date(y.at ?? 0).getTime());
  return { date: day, rows, totalPaise: rows.reduce((s, r) => s + r.amountPaise, 0) };
}

/** @param {import('express').Router} router @param {Parameters<typeof walletAdminRoutes>[0]} deps */
function explorerRoutes(router, deps) {
  const read = requirePermission(WAL.ledgerRead);
  router.get(
    '/admin/wallet/clients',
    read,
    handle(async () => ({ data: await clientWallets(deps.clock.now()) })),
  );
  router.get(
    '/admin/wallet/clients/:orgId/statement',
    read,
    validate({ params: z.strictObject({ orgId: OrgId }), query: z.strictObject({ from: Day, to: Day }) }),
    handle(async (_q, res) => walletStatement(res.locals.input.params.orgId, res.locals.input.query)),
  );
  router.get(
    '/admin/wallet/manual-credits',
    read,
    validate({ query: z.strictObject({ date: Day.optional() }) }),
    handle(async (_q, res) =>
      manualCredits(res.locals.input.query.date ?? new Date(deps.clock.now().getTime() + IST_MS).toISOString().slice(0, 10)),
    ),
  );
}
