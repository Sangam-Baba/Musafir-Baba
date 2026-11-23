// @ts-check
/**
 * Client plan and billing (plan Stage 13 §3.10, §5) — the signed-in client's own company:
 *   GET  /plans                         (`subscriptions.subscription.read`) the plans on offer
 *   GET  /subscription                  (read) the plan, status, limits, usage this month, forecast, pending change
 *   POST /subscription/change-preview   (`subscriptions.subscription.change`) {planKey} → what changes and costs now
 *   POST /subscription/change           (change) {planKey, expectedVersion}
 *   POST /subscription/cancel           (change) {undo} — at period end (undo withdraws it)
 *   GET  /billing/invoices              (read) · GET /billing/invoices/:id (the printable invoice)
 *   POST /billing/invoices/:id/pay      (change) Idempotency-Key → the PayU form for an unpaid invoice
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ConflictError, ForbiddenError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { UserRecord } from '../modules/identity/index.js';
import { daysLeft, PERMISSIONS as SUB, quotaOf } from '../modules/subscriptions/index.js';

const KEY = /^[A-Za-z0-9_-]{16,64}$/;
const PlanKey = z.string().regex(/^[A-Z0-9_]{1,20}$/);

/** @param {import('express').Response} res */
function member(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'CLIENT') throw new ForbiddenError();
  return { orgId: actor.orgId, userId: actor.userId, by: `user:${actor.userId}` };
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
 * The client's subscription view: plan, status, usage, forecast to month end, pending change.
 * @param {Parameters<typeof subscriptionRoutes>[0]} deps
 * @param {string} orgId
 */
async function view(deps, orgId) {
  const sub = (await deps.subs.current(orgId)) ?? (await deps.subs.start(orgId));
  const now = deps.clock.now();
  const q = /** @type {any} */ (await quotaOf(orgId, now));
  const { left, total } = daysLeft(now);
  const daysGone = Math.max(1, total - left + 1);
  return {
    planKey: sub.planKey,
    planName: q.terms.name,
    status: sub.status,
    period: sub.period,
    trialEndsAt: sub.trialEndsAt,
    pricePaise: q.terms.pricePaise,
    limitBehaviour: q.terms.limitBehaviour,
    overagePricePerQueryPaise: q.terms.overagePricePerQueryPaise,
    features: q.terms.features,
    overridden: q.terms.overridden,
    used: q.used,
    allowance: q.allowance,
    percent: q.percent,
    forecast: Math.round((q.used / daysGone) * total),
    pending: sub.pending,
    version: sub.version,
  };
}

/**
 * @param {{
 *   clock: import('../core/clock.js').Clock,
 *   plans: ReturnType<typeof import('../modules/subscriptions/index.js').createPlans>,
 *   subs: ReturnType<typeof import('../modules/subscriptions/index.js').createSubscriptions>,
 *   billing: ReturnType<typeof import('../modules/billing/index.js').createBilling>,
 *   payments: ReturnType<typeof import('../modules/payments/index.js').createPayments>,
 *   publicUrl: string,
 * }} deps
 */
export function subscriptionRoutes(deps) {
  const router = express.Router();
  const read = requirePermission(SUB.subscriptionRead);
  const change = requirePermission(SUB.subscriptionChange);
  router.get(
    '/plans',
    read,
    handle(async () => ({ data: await deps.plans.published() })),
  );
  router.get(
    '/subscription',
    read,
    handle(async (_q, res) => view(deps, member(res).orgId)),
  );
  router.post(
    '/subscription/change-preview',
    change,
    validate({ body: z.strictObject({ planKey: PlanKey }) }),
    handle(async (_q, res) => deps.subs.preview(member(res).orgId, res.locals.input.body.planKey)),
  );
  router.post(
    '/subscription/change',
    change,
    validate({ body: z.strictObject({ planKey: PlanKey, expectedVersion: z.number().int().min(0) }) }),
    handle(async (_q, res) => {
      const m = member(res);
      const r = await deps.subs.change({ clientOrgId: m.orgId, ...res.locals.input.body, by: m.by });
      return { kind: r.kind, chargeNowPaise: r.chargeNowPaise, subscription: await view(deps, m.orgId) };
    }),
  );
  router.post(
    '/subscription/cancel',
    change,
    validate({ body: z.strictObject({ undo: z.boolean().default(false) }) }),
    handle(async (_q, res) => {
      const m = member(res);
      await deps.subs.cancel(m.orgId, m.by, res.locals.input.body.undo);
      return view(deps, m.orgId);
    }),
  );
  invoiceRoutes(router, deps, { read, change });
  return router;
}

/**
 * @param {import('express').Router} router
 * @param {Parameters<typeof subscriptionRoutes>[0]} deps
 * @param {{ read: import('express').RequestHandler, change: import('express').RequestHandler }} guards
 */
function invoiceRoutes(router, deps, { read, change }) {
  const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
  router.get(
    '/billing/invoices',
    read,
    handle(async (_q, res) => ({ data: await deps.billing.list(member(res).orgId) })),
  );
  router.get('/billing/invoices/:id', read, validate({ params: Id }), (_req, res, next) => {
    deps.billing
      .read(member(res).orgId, res.locals.input.params.id)
      .then(
        (inv) =>
          res
            .set('Cache-Control', 'private, no-store')
            .set('Content-Type', 'text/html; charset=utf-8')
            .set(
              'Content-Security-Policy',
              "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
            )
            .set('X-Content-Type-Options', 'nosniff')
            .send(inv.html),
        next,
      );
  });
  router.post('/billing/invoices/:id/pay', change, validate({ params: Id, body: z.strictObject({}) }), (req, res, next) => {
    (async () => {
      const key = req.get('idempotency-key') ?? '';
      if (!KEY.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
      const m = member(res);
      const inv = await deps.billing.read(m.orgId, res.locals.input.params.id);
      if (inv.status !== 'UNPAID' && inv.status !== 'ISSUED') throw new ConflictError('INVOICE_NOT_PAYABLE', { invoiceStatus: inv.status });
      const u = /** @type {any} */ (await UserRecord.findById(m.userId).lean());
      const r = await withIdempotency(
        {
          scope: `invoice:${String(inv._id)}`,
          key,
          requestHash: hashRequest({ method: 'POST', path: `/billing/invoices/${String(inv._id)}/pay` }),
          clock: deps.clock,
        },
        async () => ({
          statusCode: 201,
          body: await deps.payments.createIntent({
            purpose: 'SUBSCRIPTION',
            reference: { type: 'saas-invoice', id: String(inv._id) },
            amountPaise: inv.totals.totalPaise,
            productinfo: `MusafirBaba plan invoice ${inv.number}`,
            payer: { firstname: String(u?.name ?? 'Client').slice(0, 60), email: String(u?.email ?? ''), phone: u?.phone ?? null },
            returnUrl: `${deps.publicUrl}/business/plan`,
            orgId: m.orgId,
            createdBy: m.by,
          }),
        }),
      );
      res.set('Cache-Control', 'private, no-store').status(r.statusCode).json(r.body);
    })().catch(next);
  });
}
