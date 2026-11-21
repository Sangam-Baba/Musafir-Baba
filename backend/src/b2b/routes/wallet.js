// @ts-check
/**
 * Client wallet (plan Stage 11 §3.4, §5) — the client's own company only (tenant from the signed-in member):
 *   GET  /wallet             (`wallet.account.read`)  balance, held, credit limit, available, credit used
 *   GET  /wallet/top-ups     (`wallet.account.read`)  the latest PayU top-ups and their status
 *   POST /wallet/top-ups     (`wallet.account.topup`) {amountPaise} + Idempotency-Key → the PayU form to post
 *   GET  /wallet/manual-top-ups (`wallet.account.read`) the company's bank-transfer top-ups + where to send money
 *   POST /wallet/manual-top-ups (`wallet.account.topup`) {amountPaise, method, utr, paidOn, note} — finance checks it
 *   GET  /credit             (`wallet.account.read`)  credit limit, due days, used, due date, overdue
 *   GET  /wallet/statement?from&to · /wallet/statement.csv (`wallet.account.read`) opening, entries, closing (Indian dates)
 *   PATCH /wallet/settings   (`wallet.account.topup`) {lowBalanceThresholdPaise} — 0 switches the alert off
 * Switched off until the owner turns it on (`B2B_WALLET_ENABLED=true`) → 503 WALLET_NOT_ENABLED. Where clients send bank
 * transfers: `B2B_TOPUP_BANK_DETAILS` (MusafirBaba's account, plain text).
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ForbiddenError, ServiceUnavailableError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { UserRecord } from '../modules/identity/index.js';
import { IntentRecord } from '../modules/payments/index.js';
import {
  createCreditLines,
  createLiveWallets,
  createWalletAdjustments,
  createManualTopUps,
  MANUAL_TOPUP_MAX_PAISE,
  MANUAL_TOPUP_MIN_PAISE,
  PERMISSIONS as WAL,
  TRANSFER_METHODS,
  walletStatement,
  walletStatementCsv,
} from '../modules/wallet/index.js';
import { AccountRecord } from '../modules/wallet/index.js';
import { walletAdminRoutes } from './wallet-admin.js';
import { paymentsFromEnv } from './payments-wiring.js';

const KEY = /^[A-Za-z0-9_-]{16,64}$/;
export const TOPUP_MIN_PAISE = 10_000; // ₹100
export const TOPUP_MAX_PAISE = 50_000_000; // ₹5,00,000 per PayU payment (larger amounts by bank transfer)

/** @param {import('express').Response} res */
function member(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'CLIENT') throw new ForbiddenError();
  return { orgId: actor.orgId, userId: actor.userId };
}
/** @param {import('express').Response} res */
const noStore = (res) => res.set('Cache-Control', 'private, no-store');

/** @param {Record<string, any>} i */
const topUpDto = (i) => ({
  txnId: i.txnId,
  amountPaise: i.amountPaise,
  status: i.status,
  createdAt: i.createdAt,
  paidLate: i.status === 'FAILED' && Boolean(i.gatewayPaymentId),
});

/**
 * @param {{ wallets: ReturnType<typeof import('../modules/wallet/index.js').createLiveWallets>,
 *   payments: ReturnType<typeof import('../modules/payments/index.js').createPayments>, publicUrl: string, bankDetails: string | null,
 *   manualTopUps: ReturnType<typeof createManualTopUps>, creditLines: ReturnType<typeof createCreditLines>,
 *   clock: import('../core/clock.js').Clock }} deps
 */
export function walletRoutes(deps) {
  const router = express.Router();
  router.get('/wallet', requirePermission(WAL.walletRead), (_req, res, next) => {
    const { orgId } = member(res);
    deps.wallets
      .open(orgId)
      .then(() => deps.wallets.read(orgId))
      .then((w) => noStore(res).json(w), next);
  });
  router.get('/wallet/top-ups', requirePermission(WAL.walletRead), (_req, res, next) => {
    const { orgId } = member(res);
    IntentRecord.find({ 'reference.type': 'wallet-topup', 'reference.id': orgId, purpose: 'TOPUP' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .then((rows) => noStore(res).json({ data: rows.map(topUpDto) }), next);
  });
  router.post(
    '/wallet/top-ups',
    requirePermission(WAL.walletTopUp),
    validate({ body: z.strictObject({ amountPaise: z.number().int().min(TOPUP_MIN_PAISE).max(TOPUP_MAX_PAISE) }) }),
    (req, res, next) => {
      (async () => {
        const key = req.get('idempotency-key') ?? '';
        if (!KEY.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
        const { orgId, userId } = member(res);
        const { amountPaise } = res.locals.input.body;
        const u = /** @type {any} */ (await UserRecord.findById(userId).lean());
        const r = await withIdempotency(
          {
            scope: `wallet-topup:${orgId}`,
            key,
            requestHash: hashRequest({ method: 'POST', path: '/wallet/top-ups', body: { amountPaise } }),
            clock: deps.clock,
          },
          async () => ({
            statusCode: 201,
            body: await deps.payments.createIntent({
              purpose: 'TOPUP',
              reference: { type: 'wallet-topup', id: orgId },
              amountPaise,
              productinfo: 'MusafirBaba wallet top-up',
              payer: { firstname: String(u?.name ?? 'Client').slice(0, 60), email: String(u?.email ?? ''), phone: u?.phone ?? null },
              returnUrl: `${deps.publicUrl}/business/wallet`,
              orgId,
              createdBy: `user:${userId}`,
            }),
          }),
        );
        noStore(res).status(r.statusCode).json(r.body);
      })().catch(next);
    },
  );
  manualRoutes(router, deps);
  statementRoutes(router, deps);
  return router;
}

/** @param {import('express').Router} router @param {Parameters<typeof walletRoutes>[0]} deps */
function manualRoutes(router, deps) {
  router.get('/credit', requirePermission(WAL.walletRead), (_req, res, next) => {
    const { orgId } = member(res);
    deps.wallets
      .open(orgId)
      .then(() => deps.creditLines.summary(orgId))
      .then((c) => noStore(res).json(c), next);
  });
  router.get('/wallet/manual-top-ups', requirePermission(WAL.walletRead), (_req, res, next) => {
    const { orgId } = member(res);
    deps.manualTopUps.list({ clientOrgId: orgId }).then((data) => noStore(res).json({ data, bankDetails: deps.bankDetails }), next);
  });
  router.post(
    '/wallet/manual-top-ups',
    requirePermission(WAL.walletTopUp),
    validate({
      body: z.strictObject({
        amountPaise: z.number().int().min(MANUAL_TOPUP_MIN_PAISE).max(MANUAL_TOPUP_MAX_PAISE),
        method: z.enum(TRANSFER_METHODS),
        utr: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9]{6,30}$/),
        paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        note: z.string().trim().max(500).nullish(),
      }),
    }),
    (_req, res, next) => {
      const { orgId, userId } = member(res);
      deps.manualTopUps
        .submit({ ...res.locals.input.body, clientOrgId: orgId, by: `user:${userId}` })
        .then((t) => noStore(res).status(201).json(t), next);
    },
  );
}

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const IST_MS = 330 * 60_000;

/** @param {import('express').Router} router @param {Parameters<typeof walletRoutes>[0]} deps */
function statementRoutes(router, deps) {
  /** Default: the last 30 days. @param {{ from?: string, to?: string }} q */
  const period = (q) => {
    const today = new Date(deps.clock.now().getTime() + IST_MS).toISOString().slice(0, 10);
    const from = q.from ?? new Date(Date.parse(`${today}T00:00:00Z`) - 29 * 86_400_000).toISOString().slice(0, 10);
    return { from, to: q.to ?? today };
  };
  const query = validate({ query: z.strictObject({ from: Day.optional(), to: Day.optional() }) });
  router.get('/wallet/statement', requirePermission(WAL.walletRead), query, (_req, res, next) => {
    const { orgId } = member(res);
    walletStatement(orgId, period(res.locals.input.query)).then((s) => noStore(res).json(s), next);
  });
  router.get('/wallet/statement.csv', requirePermission(WAL.walletRead), query, (_req, res, next) => {
    const { orgId } = member(res);
    const p = period(res.locals.input.query);
    walletStatement(orgId, p).then(
      (s) => noStore(res).type('text/csv').attachment(`wallet-statement-${p.from}-to-${p.to}.csv`).send(walletStatementCsv(s)),
      next,
    );
  });
  router.patch(
    '/wallet/settings',
    requirePermission(WAL.walletTopUp),
    validate({ body: z.strictObject({ lowBalanceThresholdPaise: z.number().int().min(0).max(100_000_000) }) }),
    (_req, res, next) => {
      const { orgId } = member(res);
      const threshold = res.locals.input.body.lowBalanceThresholdPaise;
      deps.wallets
        .open(orgId)
        .then(() =>
          AccountRecord.updateOne(
            { ownerOrgId: orgId, type: 'WALLET' },
            { $set: { lowBalanceThresholdPaise: threshold, lowBalanceAlerted: false } },
          ).setOptions({ tenantScope: 'SYSTEM', tenantReason: 'wallet: client settings' }),
        )
        .then(() => deps.wallets.read(orgId))
        .then((w) => noStore(res).json(w), next);
    },
  );
}

/**
 * Stage 11 routes.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {import('../core/logger.js').Logger} logger
 */
export function stage11Routes(env, clock, logger) {
  const router = express.Router();
  if (env.B2B_WALLET_ENABLED !== 'true')
    router.use(['/wallet', '/credit'], (_req, _res, next) => next(new ServiceUnavailableError('WALLET_NOT_ENABLED')));
  const { deps, payments } = paymentsFromEnv(env, clock, logger);
  const wallets = createLiveWallets({ clock, ledger: deps.ledger });
  const manualTopUps = createManualTopUps({ clock, ledger: deps.ledger, wallets });
  const creditLines = createCreditLines({ clock, ledger: deps.ledger });
  const adjustments = createWalletAdjustments({ clock, ledger: deps.ledger, wallets });
  router.use(walletAdminRoutes({ manualTopUps, creditLines, adjustments, clock }));
  router.use(
    walletRoutes({
      wallets,
      payments,
      manualTopUps,
      creditLines,
      bankDetails: env.B2B_TOPUP_BANK_DETAILS || null,
      clock,
      publicUrl: (env.B2B_PUBLIC_URL || 'https://musafirbaba.com').replace(/\/$/, ''),
    }),
  );
  return router;
}
