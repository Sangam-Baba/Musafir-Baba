// @ts-check
/**
 * The `WALLET` payment mode (plan Stage 12 §3.4) — a B2B client pays from its wallet (balance, then its credit line):
 *   start   → the order's total held in the wallet (`wal_holds`, key `order:<id>`; refused when not enough is available
 *             or credit is overdue) — instant, no gateway: the engine moves the order to CONFIRMING at once;
 *   settle  → just before the order's journal entry: the held money taken (wallet → customer advances, once);
 *   debit   → customer advances (the same account a PayU payment lands in, so the order entry is the same for both);
 *   refund  → a hold not yet taken is freed; money already taken goes back into the wallet (once per key).
 * Ledger for a wallet booking: Dr wallet / Cr customer advances (capture), then the usual order entry
 * Dr customer advances / Cr hotel payable, GST, margin.
 */
import { refundToWallet } from '../wallet/index.js';

export const WALLET_HOLD_TTL_MS = 60 * 60_000; // the engine confirms within seconds; the reconciler within a minute

/**
 * @param {{
 *   clock: import('../../core/clock.js').Clock,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger>,
 *   wallets: ReturnType<typeof import('../wallet/index.js').createLiveWallets>,
 *   holds: ReturnType<typeof import('../wallet/index.js').createHolds>,
 * }} deps
 * @returns {import('./registry.js').PaymentMode}
 */
export function createWalletMode(deps) {
  const advances = () => deps.ledger.accountId('platform', 'CUSTOMER_ADVANCES');
  return {
    instant: true,
    async start(_ctx, order) {
      const h = await deps.holds.hold({
        clientOrgId: order.clientOrgId,
        key: `order:${String(order._id)}`,
        amountPaise: order.totalPaise,
        ttlMs: WALLET_HOLD_TTL_MS,
        by: order.createdBy,
      });
      return { intentId: h.id, txnId: `WALLET-${order.ref}`, action: 'WALLET', fields: {} };
    },
    debitAccount: advances,
    async settle(_ctx, order) {
      await deps.holds.capture(order.payment.verifiedIntentId, {
        amountPaise: order.totalPaise,
        journal: {
          reference: { type: 'order-wallet', id: String(order._id) },
          purpose: 'order-paid-wallet',
          lines: [{ accountId: await advances(), creditPaise: order.totalPaise }],
          memo: order.ref,
        },
        by: 'system:orders',
      });
    },
    async refund(_ctx, order, a) {
      const h = await deps.holds.byId(a.intentId);
      if (h && h.status !== 'CAPTURED') {
        await deps.holds.release(a.intentId); // never taken — freeing it is the refund
        return;
      }
      const amount = a.amountPaise ?? order.totalPaise;
      await refundToWallet(deps, {
        clientOrgId: order.clientOrgId,
        reference: { type: 'order-refund', id: `${String(order._id)}:${a.key}` },
        amountPaise: amount,
        lines: [{ accountId: await advances(), debitPaise: amount }],
        memo: `${order.ref} — ${a.reason}`.slice(0, 500),
        by: 'system:orders',
      });
    },
  };
}
