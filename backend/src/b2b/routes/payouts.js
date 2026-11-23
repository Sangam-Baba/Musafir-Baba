// @ts-check
/**
 * Hotel payables and recorded payouts (plan Stage 09 §3.9, §5).
 * Admin:  GET  /admin/payables/due · GET /admin/payables?hotelOrgId&status     (`wallet.payout.record`)
 *         GET  /admin/manual-payouts?status · POST /admin/manual-payouts       (`wallet.payout.record`)
 *         POST /admin/manual-payouts/:id/approve | /reject                    (`wallet.payout.approve`, a different person)
 * Hotel:  GET  /hotel/statements?from&to · GET /hotel/statements.csv?from&to  (`wallet.statement.read` — the Owner)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as WAL, statementCsv } from '../modules/wallet/index.js';

const OrgId = z.string().regex(/^[a-f0-9]{24}$/);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Period = z.strictObject({ from: Day, to: Day });

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}
/** @param {import('express').Response} res */
function hotelOrg(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'HOTEL') throw new ForbiddenError();
  return actor.orgId;
}
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} fn @param {number} [status] */
const handle = (fn, status = 200) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((body) => res.status(status).set('Cache-Control', 'private, no-store').json(body), next);
    }
  );

/**
 * @param {{ payables: ReturnType<typeof import('../modules/wallet/index.js').createPayables>,
 *   payouts: ReturnType<typeof import('../modules/wallet/index.js').createPayouts> }} deps
 */
export function payoutRoutes(deps) {
  const router = express.Router();
  const record = requirePermission(WAL.payoutRecord);
  router.get(
    '/admin/payables/due',
    record,
    handle(async () => ({ data: await deps.payables.due() })),
  );
  router.get(
    '/admin/payables',
    record,
    validate({ query: z.strictObject({ hotelOrgId: OrgId, status: z.enum(['PENDING', 'ELIGIBLE', 'PAID', 'VOID']).optional() }) }),
    handle(async (_q, res) => ({
      data: await deps.payables.forHotel(res.locals.input.query.hotelOrgId, { status: res.locals.input.query.status }),
    })),
  );
  router.get(
    '/admin/manual-payouts',
    record,
    validate({ query: z.strictObject({ status: z.enum(['PROPOSED', 'APPROVED', 'REJECTED']).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.payouts.list(res.locals.input.query) })),
  );
  router.post(
    '/admin/manual-payouts',
    record,
    validate({
      body: z.strictObject({
        hotelOrgId: OrgId,
        payableIds: z.array(OrgId).min(1).max(1000),
        amountPaise: z.number().int().min(1),
        utr: z.string().trim().min(6).max(40),
        paidOn: Day,
        note: z.string().trim().max(500).nullish(),
      }),
    }),
    handle(async (_q, res) => deps.payouts.propose(staff(res), res.locals.input.body), 201),
  );
  for (const decision of /** @type {const} */ (['approve', 'reject']))
    router.post(
      `/admin/manual-payouts/:id/${decision}`,
      requirePermission(WAL.payoutApprove),
      validate({ params: z.strictObject({ id: OrgId }), body: z.strictObject({ note: z.string().trim().max(500).nullish() }) }),
      handle(async (_q, res) =>
        deps.payouts.decide(staff(res), res.locals.input.params.id, {
          approve: decision === 'approve',
          note: res.locals.input.body.note ?? null,
        }),
      ),
    );
  statementRoutes(router, deps);
  return router;
}

/** The hotel's statement. @param {import('express').Router} router @param {Parameters<typeof payoutRoutes>[0]} deps */
function statementRoutes(router, deps) {
  router.get(
    '/hotel/statements',
    requirePermission(WAL.statementRead),
    validate({ query: Period }),
    handle(async (_q, res) => deps.payouts.statement(hotelOrg(res), res.locals.input.query)),
  );
  router.get('/hotel/statements.csv', requirePermission(WAL.statementRead), validate({ query: Period }), (_req, res, next) => {
    (async () => {
      const q = res.locals.input.query;
      const csv = statementCsv(await deps.payouts.statement(hotelOrg(res), q));
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="musafirbaba-statement-${q.from}-to-${q.to}.csv"`,
          'Cache-Control': 'private, no-store',
        })
        .send(csv);
    })().catch(next);
  });
}
