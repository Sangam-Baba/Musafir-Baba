// @ts-check
/**
 * MusafirBaba admin: plans, subscriptions and billing (plan Stage 13 §3.11, §5).
 *   GET  /admin/plans                         (`subscriptions.plan.manage`) every version of every plan
 *   POST /admin/plans/:key/versions           (`subscriptions.plan.manage`) a draft version (a new key = a new plan)
 *   POST /admin/plans/versions/:id/decide     (`subscriptions.plan.publish`) {approve} — a different person
 *   POST /admin/plans/:key/retire             (`subscriptions.plan.manage`)
 *   GET  /admin/query-weights · PUT {weights: [{kind, weight}]} (`subscriptions.plan.manage`) what counts as a query
 *   GET  /admin/subscriptions                 (`subscriptions.subscription.manage`) every client, most used (%) first
 *   GET  /admin/overrides?status · POST /admin/overrides (`…subscription.manage`) · POST /admin/overrides/:id/decide
 *        (`subscriptions.override.approve`) — a different person
 *   GET  /admin/dunning                       (`subscriptions.subscription.manage`) past-due and suspended clients
 *   GET  /admin/billing/revenue?month         (`subscriptions.subscription.manage`) MRR, overage, invoiced / paid / unpaid
 */
import express from 'express';
import { z } from 'zod';

import { systemScope } from '../core/db/tenant-plugin.js';
import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { dunningBoard, InvoiceRecord } from '../modules/billing/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';
import {
  LIMIT_BEHAVIOURS,
  monthOf,
  PERMISSIONS as SUB,
  queryWeights,
  quotaOfSubscription,
  SubscriptionRecord,
} from '../modules/subscriptions/index.js';

const SYS = systemScope('subscriptions: admin', { routine: true });
const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const Key = z.strictObject({ key: z.string().regex(/^[A-Z0-9_]{1,20}$/) });
const Paise = z.number().int().min(0).max(100_000_000);
const PlanBody = z.strictObject({
  name: z.string().trim().min(2).max(60),
  monthlyQueryLimit: z.number().int().min(0).max(10_000_000),
  pricePaise: Paise,
  limitBehaviour: z.enum(LIMIT_BEHAVIOURS),
  overagePricePerQueryPaise: z.number().int().min(0).max(100_000),
  trialDays: z.number().int().min(0).max(365).default(0),
  nextPlanKey: z
    .string()
    .regex(/^[A-Z0-9_]{1,20}$/)
    .nullish(),
  features: z.strictObject({
    users: z.number().int().min(1).max(1000),
    branches: z.number().int().min(1).max(1000),
    api: z.boolean(),
    webhooks: z.boolean(),
  }),
  note: z.string().trim().max(500).nullish(),
});

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

/** Every client's subscription with its company name and this month's use, most used first. @param {Date} now */
async function subscriptionTable(now) {
  const subs = await SubscriptionRecord.find({}).setOptions(SYS).limit(2000).lean();
  const names = new Map(
    (
      await OrganizationRecord.find({ _id: { $in: subs.map((s) => s.clientOrgId) } }, { displayName: 1 })
        .setOptions(SYS)
        .lean()
    ).map((o) => [String(o._id), o.displayName]),
  );
  const weights = await queryWeights();
  const rows = [];
  for (const s of subs) {
    const q = await quotaOfSubscription(s, now, weights);
    rows.push({
      clientOrgId: s.clientOrgId,
      name: names.get(s.clientOrgId) ?? s.clientOrgId,
      planKey: s.planKey,
      planName: q.terms.name,
      status: s.status,
      used: q.used,
      allowance: q.allowance,
      percent: q.percent,
      overridden: q.terms.overridden,
      pending: s.pending,
    });
  }
  return rows.sort((a, b) => b.percent - a.percent);
}

/** Revenue for a month: MRR now (active plan prices), what was invoiced, paid and unpaid, and overage. @param {string} month @param {Date} now */
async function revenue(month, now) {
  const subs = await SubscriptionRecord.find({ status: { $in: ['ACTIVE', 'PAST_DUE'] } })
    .setOptions(SYS)
    .limit(5000)
    .lean();
  let mrrPaise = 0;
  for (const s of subs) mrrPaise += (await quotaOfSubscription(s, now)).terms.pricePaise;
  const invoices = await InvoiceRecord.find({ period: month, status: { $ne: 'VOID' } }, { status: 1, totals: 1, lines: 1 })
    .setOptions(SYS)
    .lean();
  const sum = (/** @type {(i: any) => boolean} */ f) => invoices.filter(f).reduce((a, i) => a + (i.totals?.taxablePaise ?? 0), 0);
  return {
    month,
    mrrPaise,
    activeClients: subs.length,
    invoicedPaise: sum(() => true),
    paidPaise: sum((i) => i.status === 'PAID'),
    unpaidPaise: sum((i) => i.status === 'UNPAID'),
    overagePaise: invoices
      .flatMap((i) => i.lines)
      .filter((l) => l.kind === 'OVERAGE')
      .reduce((a, l) => a + (l.amountPaise ?? 0), 0),
  };
}

/**
 * @param {{ clock: import('../core/clock.js').Clock,
 *   plans: ReturnType<typeof import('../modules/subscriptions/index.js').createPlans>,
 *   overrides: ReturnType<typeof import('../modules/subscriptions/index.js').createOverrides> }} deps
 */
export function subscriptionAdminRoutes(deps) {
  const router = express.Router();
  const manage = requirePermission(SUB.planManage);
  router.get(
    '/admin/plans',
    manage,
    handle(async () => ({ data: await deps.plans.all() })),
  );
  router.post(
    '/admin/plans/:key/versions',
    manage,
    validate({ params: Key, body: PlanBody }),
    handle(async (_q, res) => deps.plans.propose(staff(res), res.locals.input.params.key, res.locals.input.body)),
  );
  router.post(
    '/admin/plans/versions/:id/decide',
    requirePermission(SUB.planPublish),
    validate({ params: Id, body: z.strictObject({ approve: z.boolean() }) }),
    handle(async (_q, res) => deps.plans.decide(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  router.post(
    '/admin/plans/:key/retire',
    manage,
    validate({ params: Key, body: z.strictObject({}) }),
    handle(async (_q, res) => deps.plans.retire(staff(res), res.locals.input.params.key)),
  );
  router.get(
    '/admin/query-weights',
    manage,
    handle(async () => deps.plans.weights()),
  );
  router.put(
    '/admin/query-weights',
    manage,
    // a list, not an object: keys with dots are refused by the input guard (Mongo-operator safety)
    validate({
      body: z.strictObject({
        weights: z
          .array(z.strictObject({ kind: z.string().regex(/^hotel\.[a-z]+$/), weight: z.number().int().min(0).max(100) }))
          .min(1)
          .max(20),
      }),
    }),
    handle(async (_q, res) =>
      deps.plans.setWeights(
        staff(res),
        Object.fromEntries(res.locals.input.body.weights.map((/** @type {{ kind: string, weight: number }} */ w) => [w.kind, w.weight])),
      ),
    ),
  );
  clientRoutes(router, deps);
  return router;
}

/** @param {import('express').Router} router @param {Parameters<typeof subscriptionAdminRoutes>[0]} deps */
function clientRoutes(router, deps) {
  const manage = requirePermission(SUB.subscriptionManage);
  router.get(
    '/admin/subscriptions',
    manage,
    handle(async () => ({ data: await subscriptionTable(deps.clock.now()) })),
  );
  router.get(
    '/admin/overrides',
    manage,
    validate({ query: z.strictObject({ status: z.enum(['PROPOSED', 'APPROVED', 'REJECTED']).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.overrides.list(res.locals.input.query) })),
  );
  router.post(
    '/admin/overrides',
    manage,
    validate({
      body: z.strictObject({
        clientOrgId: z.string().regex(/^[a-f0-9]{24}$/),
        kind: z.enum(['OVERRIDE', 'TOPUP']),
        reason: z.string().trim().min(3).max(500),
        queries: z.number().int().min(1).max(10_000_000).optional(),
        terms: z
          .strictObject({
            queryLimit: z.number().int().min(0).max(10_000_000).optional(),
            pricePaise: Paise.optional(),
            limitBehaviour: z.enum(LIMIT_BEHAVIOURS).optional(),
            overagePricePerQueryPaise: z.number().int().min(0).max(100_000).optional(),
            expiresAt: z.coerce.date().nullish(),
          })
          .optional(),
      }),
    }),
    handle(async (_q, res) => deps.overrides.propose(staff(res), res.locals.input.body)),
  );
  router.post(
    '/admin/overrides/:id/decide',
    requirePermission(SUB.overrideApprove),
    validate({ params: Id, body: z.strictObject({ approve: z.boolean() }) }),
    handle(async (_q, res) => deps.overrides.decide(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  router.get(
    '/admin/dunning',
    manage,
    handle(async () => ({ data: await dunningBoard() })),
  );
  router.get(
    '/admin/billing/revenue',
    manage,
    validate({
      query: z.strictObject({
        month: z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .optional(),
      }),
    }),
    handle(async (_q, res) => revenue(res.locals.input.query.month ?? monthOf(deps.clock.now()), deps.clock.now())),
  );
}
