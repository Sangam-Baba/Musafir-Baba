// @ts-check
/**
 * Stage 18 B7 — paying bus companies (a separate run from hotels) and trip problems (mounted by `busCatalogRoutes`,
 * so 503 while `B2B_BUS_ENABLED` is off):
 *   operator  GET /bus/payables?status · GET /bus/payouts                       (`bus-payouts.payable.read` — Owner)
 *             POST /bus/trips/:id/problems {kind, note, delayMinutes?}          (`bus-inventory.trip.manage`)
 *             GET /bus/problems                                                (`bus-inventory.trip.read`)
 *   admin     GET / POST /admin/bus/payout-runs {cycleEnd} · GET /admin/bus/payout-runs/:id
 *             POST /admin/bus/payout-runs/:id/approve | /bank-file | /paid {bankReference} | /cancel
 *             POST /admin/bus/payout-lines/:id/hold {hold}      (`wallet.payout.record`; approve: `wallet.payout.approve`)
 *             GET /admin/bus/problems?status · POST /admin/bus/problems/:id/resolve {resolution}   (`platform.bus.review`)
 */
import { z } from 'zod';

import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as BUS } from '../modules/bus-catalog/index.js';
import { createTripProblems, PERMISSIONS as TRIPS, TRIP_PROBLEM_KINDS } from '../modules/bus-inventory/index.js';
import { createBusPayables, createBusPayoutRuns, PERMISSIONS as PAY } from '../modules/bus-payouts/index.js';
import { createKycService } from '../modules/kyc/index.js';
import { createLedger, PERMISSIONS as WAL } from '../modules/wallet/index.js';
import { DateStr, input, operatorOf, Params } from './bus-http.js';
import { createFiles } from './files.js';
import { hotelFacts } from './finance-wiring.js';
import { handle, staffOf } from './payout-finance-admin.js';

/** @typedef {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock }} BusPayoutDeps */

/** @param {import('express').Router} router @param {BusPayoutDeps} deps */
function operatorRoutes(router, deps) {
  const payables = createBusPayables({ clock: deps.clock, logger: /** @type {any} */ ({ warn: () => {} }) });
  const runs = runsFor(deps);
  const problems = createTripProblems({ clock: deps.clock });
  const read = requirePermission(PAY.payableRead);
  router.get(
    '/bus/payables',
    read,
    validate({ query: z.strictObject({ status: z.enum(['PENDING', 'ELIGIBLE', 'PAID', 'VOID']).optional() }) }),
    handle(async (_q, res) => ({ data: await payables.forOperator(operatorOf(res).orgId, input(res).query) })),
  );
  router.get(
    '/bus/payouts',
    read,
    handle(async (_q, res) => ({ data: await runs.forOperator(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/trips/:id/problems',
    requirePermission(TRIPS.tripManage),
    validate({
      params: Params,
      body: z.strictObject({
        kind: z.enum(TRIP_PROBLEM_KINDS),
        note: z.string().trim().min(5).max(1000),
        delayMinutes: z.number().int().min(1).max(2880).nullish(),
      }),
    }),
    handle(async (_q, res) => problems.report(operatorOf(res), input(res).params.id, input(res).body), 201),
  );
  router.get(
    '/bus/problems',
    requirePermission(TRIPS.tripRead),
    handle(async (_q, res) => ({ data: await problems.mine(operatorOf(res).orgId) })),
  );
}

/** @param {BusPayoutDeps} deps */
function runsFor(deps) {
  const kyc = createKycService({
    clock: deps.clock,
    files: createFiles(deps.env, deps.clock),
    fieldKey: deps.env.B2B_FILE_KEY ?? deps.env.B2B_AUTH_SECRET,
  });
  return createBusPayoutRuns({
    clock: deps.clock,
    ledger: createLedger({ clock: deps.clock }),
    facts: hotelFacts,
    account: async (orgId, viewer) => (await kyc.revealSensitive(orgId, viewer)).accountNumber,
  });
}

/** @param {import('express').Router} router @param {BusPayoutDeps} deps */
function adminRoutes(router, deps) {
  const runs = runsFor(deps);
  const record = requirePermission(WAL.payoutRecord);
  router.get(
    '/admin/bus/payout-runs',
    record,
    handle(async () => ({ data: await runs.list() })),
  );
  router.post(
    '/admin/bus/payout-runs',
    record,
    validate({ body: z.strictObject({ cycleEnd: DateStr }) }),
    handle(async (_q, res) => runs.propose(staffOf(res), input(res).body), 201),
  );
  router.get(
    '/admin/bus/payout-runs/:id',
    record,
    validate({ params: Params }),
    handle(async (_q, res) => runs.get(input(res).params.id)),
  );
  router.post(
    '/admin/bus/payout-runs/:id/approve',
    requirePermission(WAL.payoutApprove),
    validate({ params: Params }),
    handle(async (_q, res) => runs.approve(staffOf(res), input(res).params.id)),
  );
  router.post('/admin/bus/payout-runs/:id/bank-file', record, validate({ params: Params }), (_req, res, next) => {
    runs
      .bankFile(staffOf(res), input(res).params.id)
      .then(
        (csv) =>
          res
            .set('Content-Type', 'text/csv; charset=utf-8')
            .set('Cache-Control', 'private, no-store')
            .set('Content-Disposition', 'attachment; filename="bus-payouts.csv"')
            .send(csv),
        next,
      );
  });
  router.post(
    '/admin/bus/payout-runs/:id/paid',
    record,
    validate({ params: Params, body: z.strictObject({ bankReference: z.string().trim().min(4).max(60) }) }),
    handle(async (_q, res) => runs.paid(staffOf(res), input(res).params.id, input(res).body)),
  );
  router.post(
    '/admin/bus/payout-runs/:id/cancel',
    record,
    validate({ params: Params }),
    handle(async (_q, res) => runs.cancel(staffOf(res), input(res).params.id)),
  );
  router.post(
    '/admin/bus/payout-lines/:id/hold',
    record,
    validate({ params: Params, body: z.strictObject({ hold: z.boolean() }) }),
    handle(async (_q, res) => runs.hold(staffOf(res), input(res).params.id, input(res).body.hold)),
  );
}

/** Trip problems queue for ops. @param {import('express').Router} router @param {BusPayoutDeps} deps */
function problemRoutes(router, deps) {
  const problems = createTripProblems({ clock: deps.clock });
  const review = requirePermission(BUS.platformReview);
  router.get(
    '/admin/bus/problems',
    review,
    validate({ query: z.strictObject({ status: z.enum(['OPEN', 'RESOLVED']).optional() }) }),
    handle(async (_q, res) => ({ data: await problems.queue(input(res).query) })),
  );
  router.post(
    '/admin/bus/problems/:id/resolve',
    review,
    validate({ params: Params, body: z.strictObject({ resolution: z.string().trim().min(3).max(1000) }) }),
    handle(async (_q, res) => problems.resolve(staffOf(res), input(res).params.id, input(res).body.resolution)),
  );
}

/** @param {import('express').Router} router @param {BusPayoutDeps} deps */
export function addBusPayoutRoutes(router, deps) {
  operatorRoutes(router, deps);
  adminRoutes(router, deps);
  problemRoutes(router, deps);
}
