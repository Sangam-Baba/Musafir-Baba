// @ts-check
/**
 * Stage 07 wiring: PayU on the existing merchant account (`PAYU_KEY`, `PAYU_SALT`, `PAYU_ENV` — read only) and the new
 * API's own return address (`B2B_API_PUBLIC_URL`, e.g. https://musafirbabaserver.3mongoose.online/api/v1). Without
 * those settings payments stay switched off (503 PAYMENTS_NOT_CONFIGURED) and nothing else changes.
 */
import express from 'express';

import { createPayments, createPaymentsAdmin, createPayuClient, merchantFromEnv } from '../modules/payments/index.js';
import { balancesOf, createAdjustments, createLedger, createPayouts, entriesOf } from '../modules/wallet/index.js';
import { financeAdminRoutes } from './finance-admin.js';
import { payablesFor } from './payables-wiring.js';
import { payoutRoutes } from './payouts.js';
import { payuCallbackRoutes } from './payments-payu.js';

/**
 * The payments service for this process (also used by background work).
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {import('../core/logger.js').Logger} logger
 */
export function paymentsFromEnv(env, clock, logger) {
  const merchant = merchantFromEnv(env);
  const apiUrl = env.B2B_API_PUBLIC_URL ? env.B2B_API_PUBLIC_URL.replace(/\/$/, '') : null;
  const deps = {
    clock,
    logger,
    merchant,
    payu: merchant ? createPayuClient({ merchant }) : null,
    ledger: createLedger({ clock }),
    callbackUrl: apiUrl ? `${apiUrl}/payments/payu/callback` : null,
  };
  return { deps, payments: createPayments(deps) };
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {import('../core/logger.js').Logger} logger
 */
export function stage07Routes(env, clock, logger) {
  const router = express.Router();
  const { deps, payments } = paymentsFromEnv(env, clock, logger);
  const publicUrl = env.B2B_PUBLIC_URL || 'https://musafirbaba.com';
  router.use(payuCallbackRoutes({ payments, publicUrl }));
  router.use(
    financeAdminRoutes({
      ledger: { balances: () => balancesOf(), entries: (id) => entriesOf(id) },
      adjustments: createAdjustments({ clock, ledger: deps.ledger }),
      payments: createPaymentsAdmin(deps),
      publicUrl,
    }),
  );
  router.use(payoutRoutes({ payables: payablesFor({ clock, logger }), payouts: createPayouts({ clock, ledger: deps.ledger }) }));
  return router;
}
