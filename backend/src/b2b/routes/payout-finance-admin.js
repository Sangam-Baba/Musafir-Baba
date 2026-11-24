// @ts-check
/**
 * Stage 15 admin routes (plan §5) — MusafirBaba staff only:
 *   payout runs   GET /admin/payout-runs · POST /admin/payout-runs {cycleEnd} · GET /admin/payout-runs/:id
 *                 POST /admin/payout-lines/:id/hold {hold, note} · POST /admin/payout-runs/:id/cancel {reason}  (`wallet.payout.record`)
 *                 POST /admin/payout-runs/:id/approve · /bank-file · /paid {bankReference}                       (`wallet.payout.approve`; a different person approves)
 *   deductions    GET /admin/deduction-rules · POST /admin/deduction-rules · POST /admin/deduction-rules/:id/retire
 *   disputes      GET /admin/statement-disputes?status · POST /admin/statement-disputes/:id/resolve {accept, note}
 *   GST           GET /admin/gst-registers?month (&format=csv) · POST /admin/periods/:month/lock {note}           (`reporting.reports.read` / `reporting.period.lock`)
 *   reports       GET /admin/reports · GET /admin/reports/:name?from&to&by&channel&groupBy (&format=csv)         (`reporting.reports.read`)
 *   export        GET /admin/exports/journal?from&to (CSV)                                                       (`reporting.reports.read`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { gstRegister, gstRegisterCsv, lockPeriod } from '../modules/billing/index.js';
import { ADMIN_REPORTS, PERMISSIONS as RPT } from '../modules/reporting/index.js';
import { journalExport, PERMISSIONS as WAL } from '../modules/wallet/index.js';

export const Id = z.string().regex(/^[a-f0-9]{24}$/);
export const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const Note = z.string().trim().max(500);
const ReportQuery = z.strictObject({
  from: Day,
  to: Day,
  by: z.enum(['day', 'month']).optional(),
  channel: z.enum(['WEBSITE', 'B2B_PORTAL', 'B2B_API', 'ADMIN', 'SYSTEM']).optional(),
  groupBy: z.enum(['client', 'hotel', 'destination']).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

/** @param {import('express').Response} res */
export function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} fn @param {number} [status] */
export const handle = (fn, status = 200) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((body) => res.status(status).set('Cache-Control', 'private, no-store').json(body), next);
    }
  );
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<{ filename: string, csv: string }>} fn */
export const sendCsv = (fn) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then(
          (f) =>
            res
              .set({
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="musafirbaba-${f.filename}"`,
                'Cache-Control': 'private, no-store',
              })
              .send(f.csv),
          next,
        );
    }
  );
/** @param {import('express').Response} res */
const input = (res) => /** @type {{ params: any, query: any, body: any }} */ (res.locals.input);

/**
 * @typedef {{
 *   clock: import('../core/clock.js').Clock,
 *   runs: ReturnType<typeof import('../modules/wallet/index.js').createPayoutRuns>,
 *   disputes: ReturnType<typeof import('../modules/wallet/index.js').createStatementDisputes>,
 *   reports: ReturnType<typeof import('../modules/reporting/index.js').createAdminReports>,
 * }} Stage15AdminDeps
 */

/** @param {import('express').Router} router @param {Stage15AdminDeps} deps */
function payoutRunRoutes(router, deps) {
  const record = requirePermission(WAL.payoutRecord);
  const approve = requirePermission(WAL.payoutApprove);
  const RunId = validate({ params: z.strictObject({ id: Id }) });
  router.get(
    '/admin/payout-runs',
    record,
    handle(async () => ({ data: await deps.runs.list() })),
  );
  router.post(
    '/admin/payout-runs',
    record,
    validate({ body: z.strictObject({ cycleEnd: Day }) }),
    handle(async (_q, res) => deps.runs.propose(staffOf(res), input(res).body), 201),
  );
  router.get(
    '/admin/payout-runs/:id',
    record,
    RunId,
    handle(async (_q, res) => deps.runs.read(input(res).params.id)),
  );
  router.post(
    '/admin/payout-lines/:id/hold',
    record,
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ hold: z.boolean(), note: Note.nullish() }) }),
    handle(async (_q, res) => deps.runs.setHold(staffOf(res), input(res).params.id, input(res).body)),
  );
  router.post(
    '/admin/payout-runs/:id/cancel',
    record,
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ reason: Note.min(3) }) }),
    handle(async (_q, res) => deps.runs.cancel(staffOf(res), input(res).params.id, input(res).body.reason)),
  );
  router.post(
    '/admin/payout-runs/:id/approve',
    approve,
    RunId,
    handle(async (_q, res) => deps.runs.approve(staffOf(res), input(res).params.id)),
  );
  router.post(
    '/admin/payout-runs/:id/bank-file',
    approve,
    RunId,
    sendCsv(async (_q, res) => {
      const f = await deps.runs.bankFile(staffOf(res), input(res).params.id);
      return { filename: `payout-${input(res).params.id}.csv`, csv: f.csv };
    }),
  );
  router.post(
    '/admin/payout-runs/:id/paid',
    approve,
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ bankReference: z.string().trim().min(4).max(60) }) }),
    handle(async (_q, res) => deps.runs.markPaid(staffOf(res), input(res).params.id, input(res).body.bankReference)),
  );
}

/** @param {import('express').Router} router @param {Stage15AdminDeps} deps */
function ruleAndDisputeRoutes(router, deps) {
  const record = requirePermission(WAL.payoutRecord);
  const approve = requirePermission(WAL.payoutApprove);
  router.get(
    '/admin/deduction-rules',
    record,
    handle(async () => ({ data: await deps.runs.deductionRules() })),
  );
  router.post(
    '/admin/deduction-rules',
    approve,
    validate({
      body: z.strictObject({
        hotelOrgId: Id.nullish(),
        label: z.string().trim().min(2).max(80),
        type: z.enum(['PERCENT', 'FIXED']),
        valueBps: z.number().int().min(1).max(10_000).optional(),
        amountPaise: z.number().int().min(1).max(100_000_000).optional(),
      }),
    }),
    handle(async (_q, res) => deps.runs.addDeductionRule(staffOf(res), input(res).body), 201),
  );
  router.post(
    '/admin/deduction-rules/:id/retire',
    approve,
    validate({ params: z.strictObject({ id: Id }) }),
    handle(async (_q, res) => deps.runs.retireDeductionRule(input(res).params.id)),
  );
  router.get(
    '/admin/statement-disputes',
    record,
    validate({ query: z.strictObject({ status: z.enum(['OPEN', 'ACCEPTED', 'REJECTED']).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.disputes.queue(input(res).query) })),
  );
  router.post(
    '/admin/statement-disputes/:id/resolve',
    approve,
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ accept: z.boolean(), note: Note.min(3) }) }),
    handle(async (_q, res) => deps.disputes.resolve(staffOf(res), input(res).params.id, input(res).body)),
  );
}

/** @param {import('express').Router} router @param {Stage15AdminDeps} deps */
function reportRoutes(router, deps) {
  const read = requirePermission(RPT.reportsRead);
  router.get(
    '/admin/gst-registers',
    read,
    validate({ query: z.strictObject({ month: Month, format: z.enum(['json', 'csv']).optional() }) }),
    (req, res, next) => {
      const q = input(res).query;
      if (q.format === 'csv')
        return sendCsv(async () => ({ filename: `gst-register-${q.month}.csv`, csv: gstRegisterCsv(await gstRegister(q.month)) }))(
          req,
          res,
          next,
        );
      return handle(async () => gstRegister(q.month))(req, res, next);
    },
  );
  router.post(
    '/admin/periods/:month/lock',
    requirePermission(RPT.periodLock),
    validate({ params: z.strictObject({ month: Month }), body: z.strictObject({ note: Note.nullish() }) }),
    handle(async (_q, res) => lockPeriod({ clock: deps.clock }, staffOf(res), input(res).params.month, input(res).body.note ?? null)),
  );
  router.get(
    '/admin/reports',
    read,
    handle(async () => ({ data: [...ADMIN_REPORTS] })),
  );
  router.get(
    '/admin/reports/:name',
    read,
    validate({ params: z.strictObject({ name: z.enum(ADMIN_REPORTS) }), query: ReportQuery }),
    (req, res, next) => {
      const { format, ...f } = input(res).query;
      const name = input(res).params.name;
      if (format === 'csv') return sendCsv(async () => deps.reports.csv(name, f))(req, res, next);
      return handle(async () => deps.reports.run(name, f))(req, res, next);
    },
  );
  router.get(
    '/admin/exports/journal',
    read,
    validate({ query: z.strictObject({ from: Day, to: Day }) }),
    sendCsv(async (_q, res) => {
      const x = await journalExport(input(res).query);
      return { filename: x.filename, csv: x.csv };
    }),
  );
}

/** @param {Stage15AdminDeps} deps */
export function stage15AdminRoutes(deps) {
  const router = express.Router();
  payoutRunRoutes(router, deps);
  ruleAndDisputeRoutes(router, deps);
  reportRoutes(router, deps);
  return router;
}
