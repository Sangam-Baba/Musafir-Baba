// @ts-check
/**
 * Client wallet (plan Stage 11 §3.4, §5) — the client's own company only (tenant from the signed-in member):
 *   GET  /wallet             (`wallet.account.read`)  balance, held, credit limit, available, credit used
 *   GET  /wallet/top-ups     (`wallet.account.read`)  the latest PayU top-ups and their status
 *   POST /wallet/top-ups     (`wallet.account.topup`) {amountPaise} + Idempotency-Key → the PayU form to post
 * Switched off until the owner turns it on (`B2B_WALLET_ENABLED=true`) → 503 WALLET_NOT_ENABLED.
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
import { createLiveWallets, PERMISSIONS as WAL } from '../modules/wallet/index.js';
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
 *   payments: ReturnType<typeof import('../modules/payments/index.js').createPayments>, publicUrl: string,
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
  return router;
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
    router.use('/wallet', (_req, _res, next) => next(new ServiceUnavailableError('WALLET_NOT_ENABLED')));
  const { deps, payments } = paymentsFromEnv(env, clock, logger);
  router.use(
    walletRoutes({
      wallets: createLiveWallets({ clock, ledger: deps.ledger }),
      payments,
      clock,
      publicUrl: (env.B2B_PUBLIC_URL || 'https://musafirbaba.com').replace(/\/$/, ''),
    }),
  );
  return router;
}
