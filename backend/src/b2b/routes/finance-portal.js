// @ts-check
/**
 * Stage 15 business-area routes (plan §5):
 *   hotel   GET /hotel/payouts · GET /hotel/payouts/:id/statement                       (`wallet.statement.read`)
 *           GET /hotel/statement-disputes · POST /hotel/statement-disputes {payableId, message}
 *   client  GET /reports/bookings|spend?from&to&groupBy (&format=csv)                   (`orders.export.read`, limited like the bookings list)
 *           GET /reports/usage?from&to (&format=csv)                                     (`metering.usage.read`, whole-company viewers)
 *           GET /branding (`organizations.org.read`) · PUT /branding (`organizations.org.update`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as MTR } from '../modules/metering/index.js';
import { PERMISSIONS as ORD } from '../modules/orders/index.js';
import { brandingOf, PERMISSIONS as ORG, saveBranding } from '../modules/organizations/index.js';
import { PERMISSIONS as WAL } from '../modules/wallet/index.js';
import { Day, handle, Id, sendCsv } from './payout-finance-admin.js';

/** @param {import('express').Response} res */
function hotelOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'HOTEL') throw new ForbiddenError();
  return { orgId: actor.orgId, by: `user:${actor.userId}` };
}
/** @param {import('express').Response} res */
function clientOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'CLIENT') throw new ForbiddenError();
  return {
    by: `user:${actor.userId}`,
    who: { clientOrgId: actor.orgId, branchIds: actor.branchIds ?? [], ownUser: actor.ownOnly ? `user:${actor.userId}` : null },
  };
}
/** @param {import('express').Response} res */
const input = (res) => /** @type {{ params: any, query: any, body: any }} */ (res.locals.input);
const Nullable = (/** @type {z.ZodString} */ s) => s.nullable();

/**
 * @typedef {{
 *   runs: ReturnType<typeof import('../modules/wallet/index.js').createPayoutRuns>,
 *   disputes: ReturnType<typeof import('../modules/wallet/index.js').createStatementDisputes>,
 *   clientReports: ReturnType<typeof import('../modules/reporting/index.js').createClientReports>,
 * }} PortalDeps
 */

/** @param {import('express').Router} router @param {PortalDeps} deps */
function hotelRoutes(router, deps) {
  const read = requirePermission(WAL.statementRead);
  router.get(
    '/hotel/payouts',
    read,
    handle(async (_q, res) => ({ data: await deps.runs.forHotel(hotelOf(res).orgId) })),
  );
  router.get(
    '/hotel/payouts/:id/statement',
    read,
    validate({ params: z.strictObject({ id: Id }) }),
    handle(async (_q, res) => deps.disputes.payoutStatement(hotelOf(res).orgId, input(res).params.id)),
  );
  router.get(
    '/hotel/statement-disputes',
    read,
    handle(async (_q, res) => ({ data: await deps.disputes.mine(hotelOf(res).orgId) })),
  );
  router.post(
    '/hotel/statement-disputes',
    read,
    validate({ body: z.strictObject({ payableId: Id, message: z.string().trim().min(5).max(1000) }) }),
    handle(async (_q, res) => {
      const h = hotelOf(res);
      return deps.disputes.raise(h.orgId, h.by, input(res).body);
    }, 201),
  );
}

/** @param {import('express').Router} router @param {PortalDeps} deps */
function clientRoutes(router, deps) {
  const Range = { from: Day, to: Day, format: z.enum(['json', 'csv']).optional() };
  /** @param {string} name @returns {import('express').RequestHandler} */
  const run = (name) => (req, res, next) => {
    const { format, ...f } = input(res).query;
    const { who } = clientOf(res);
    if (format === 'csv') return sendCsv(async () => deps.clientReports.csv(who, name, f))(req, res, next);
    return handle(async () => deps.clientReports.run(who, name, f))(req, res, next);
  };
  for (const name of ['bookings', 'spend'])
    router.get(
      `/reports/${name}`,
      requirePermission(ORD.exportRead),
      validate({ query: z.strictObject({ ...Range, groupBy: z.enum(['destination', 'branch', 'booker']).optional() }) }),
      run(name),
    );
  router.get('/reports/usage', requirePermission(MTR.usageRead), validate({ query: z.strictObject(Range) }), run('usage'));
  router.get(
    '/branding',
    requirePermission(ORG.orgRead),
    handle(async (_q, res) => ({ data: await brandingOf(clientOf(res).who.clientOrgId) })),
  );
  router.put(
    '/branding',
    requirePermission(ORG.orgUpdate),
    validate({
      body: z.strictObject({
        name: z.string().trim().min(2).max(80),
        contactPhone: Nullable(z.string().trim().max(20)),
        contactEmail: Nullable(z.string().trim().max(120)),
        colour: Nullable(z.string().trim().max(7)),
        logoUrl: Nullable(z.string().trim().max(500)),
        expectedVersion: z.number().int().min(0),
      }),
    }),
    handle(async (_q, res) => {
      const c = clientOf(res);
      return saveBranding(c.who.clientOrgId, c.by, input(res).body);
    }),
  );
}

/** @param {PortalDeps} deps */
export function financePortalRoutes(deps) {
  const router = express.Router();
  hotelRoutes(router, deps);
  clientRoutes(router, deps);
  return router;
}
