// @ts-check
/**
 * MusafirBaba admin: finance basics (plan Stage 07 §3.6, §5).
 * GET  /admin/accounts · /admin/accounts/:id/entries                          (`wallet.ledger.read`)
 * GET  /admin/adjustments · POST /admin/adjustments                          (`wallet.ledger.read` / `wallet.adjustment.propose`)
 * POST /admin/adjustments/:id/approve | /reject                               (`wallet.adjustment.approve`, a second person)
 * GET  /admin/payments?status · /admin/refunds · /admin/settlements · /admin/recon-exceptions?status (`payments.payment.read`)
 * POST /admin/recon-exceptions/:id/resolve · POST /admin/settlements/import  (`payments.recon.manage`)
 * POST /admin/refunds                                                         (`payments.refund.create`)
 * POST /admin/payments/test                                                   (`payments.test.run`) → the PayU form
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { INTENT_STATUSES, PERMISSIONS as PAY } from '../modules/payments/index.js';
import { PERMISSIONS as LED, REASON_CODES } from '../modules/wallet/index.js';

const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const Paise = z.number().int().min(0).max(10_000_000_000);
const Line = z.strictObject({ accountId: z.string().regex(/^[a-f0-9]{24}$/), debitPaise: Paise.optional(), creditPaise: Paise.optional() });
const SettlementLine = z.strictObject({
  txnid: z.string().max(40),
  mihpayid: z.string().max(40),
  amountPaise: Paise,
  feePaise: Paise.default(0),
  taxPaise: Paise.default(0),
  settledPaise: Paise.default(0),
  utr: z.string().max(40).nullable().default(null),
  action: z.enum(['capture', 'refund']).default('capture'),
  settledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
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
 * @param {import('express').Router} router
 * @param {Parameters<typeof financeAdminRoutes>[0]} deps
 */
function ledgerRoutes(router, deps) {
  const readLedger = requirePermission(LED.ledgerRead);
  router.get(
    '/admin/accounts',
    readLedger,
    handle(async () => ({ data: await deps.ledger.balances() })),
  );
  router.get(
    '/admin/accounts/:id/entries',
    readLedger,
    validate({ params: Id }),
    handle(async (_q, res) => ({ data: await deps.ledger.entries(res.locals.input.params.id) })),
  );
  router.get(
    '/admin/adjustments',
    readLedger,
    handle(async () => ({ data: await deps.adjustments.list() })),
  );
  router.post(
    '/admin/adjustments',
    requirePermission(LED.adjustmentPropose),
    validate({
      body: z.strictObject({
        reasonCode: z.enum(REASON_CODES),
        note: z.string().trim().min(5).max(500),
        lines: z.array(Line).min(2).max(50),
      }),
    }),
    handle(async (_q, res) => deps.adjustments.propose(staff(res), res.locals.input.body), 201),
  );
  for (const action of /** @type {const} */ (['approve', 'reject']))
    router.post(
      `/admin/adjustments/:id/${action}`,
      requirePermission(LED.adjustmentApprove),
      validate({ params: Id, body: z.strictObject({ note: z.string().trim().max(500).nullish() }) }),
      handle(async (_q, res) =>
        deps.adjustments.decide(staff(res), res.locals.input.params.id, {
          approve: action === 'approve',
          note: res.locals.input.body.note ?? null,
        }),
      ),
    );
}

/**
 * @param {import('express').Router} router
 * @param {Parameters<typeof financeAdminRoutes>[0]} deps
 */
function paymentRoutes(router, deps) {
  const readPay = requirePermission(PAY.paymentRead);
  router.get(
    '/admin/payments',
    readPay,
    validate({ query: z.strictObject({ status: z.enum(INTENT_STATUSES).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.payments.payments(res.locals.input.query) })),
  );
  router.get(
    '/admin/refunds',
    readPay,
    handle(async () => ({ data: await deps.payments.refunds() })),
  );
  router.get(
    '/admin/settlements',
    readPay,
    handle(async () => ({ data: await deps.payments.settlements() })),
  );
  router.get(
    '/admin/recon-exceptions',
    readPay,
    validate({ query: z.strictObject({ status: z.enum(['OPEN', 'RESOLVED']).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.payments.exceptions(res.locals.input.query) })),
  );
}

/**
 * @param {import('express').Router} router
 * @param {Parameters<typeof financeAdminRoutes>[0]} deps
 */
function paymentActionRoutes(router, deps) {
  router.post(
    '/admin/recon-exceptions/:id/resolve',
    requirePermission(PAY.reconManage),
    validate({ params: Id, body: z.strictObject({ note: z.string().trim().min(5).max(500) }) }),
    handle(async (_q, res) => deps.payments.resolveException(staff(res), res.locals.input.params.id, res.locals.input.body.note)),
  );
  router.post(
    '/admin/settlements/import',
    requirePermission(PAY.reconManage),
    validate({ body: z.strictObject({ lines: z.array(SettlementLine).min(1).max(5000) }) }),
    handle(async (_q, res) => deps.payments.importSettlements(res.locals.input.body.lines)),
  );
  router.post(
    '/admin/refunds',
    requirePermission(PAY.refundCreate),
    validate({
      body: z.strictObject({
        intentId: z.string().regex(/^[a-f0-9]{24}$/),
        amountPaise: Paise.min(1),
        reason: z.string().trim().min(5).max(300),
        requestId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
      }),
    }),
    handle(async (_q, res) => deps.payments.refund(staff(res), res.locals.input.body), 201),
  );
  router.post(
    '/admin/payments/test',
    requirePermission(PAY.testRun),
    validate({
      body: z.strictObject({
        amountPaise: z.number().int().min(100).max(1000).default(100),
        email: z.string().email().max(254),
        name: z.string().trim().min(2).max(60),
      }),
    }),
    handle(
      async (_q, res) =>
        deps.payments.testPayment(staff(res), { ...res.locals.input.body, returnUrl: `${deps.publicUrl.replace(/\/$/, '')}/admin/b2b` }),
      201,
    ),
  );
}

/**
 * @param {{ ledger: { balances: () => Promise<unknown>, entries: (id: string) => Promise<unknown> },
 *   adjustments: ReturnType<typeof import('../modules/wallet/index.js').createAdjustments>,
 *   payments: ReturnType<typeof import('../modules/payments/index.js').createPaymentsAdmin>, publicUrl: string }} deps
 */
export function financeAdminRoutes(deps) {
  const router = express.Router();
  ledgerRoutes(router, deps);
  paymentRoutes(router, deps);
  paymentActionRoutes(router, deps);
  return router;
}
