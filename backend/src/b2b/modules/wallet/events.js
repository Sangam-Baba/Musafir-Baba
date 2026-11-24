// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** a correcting entry was approved and posted */
  adjustmentPosted: 'wallet.adjustment.posted',
  /** a derived balance did not match its journal lines (invariant check) */
  invariantBroken: 'wallet.invariant.broken',
  /** Stage 11: money reached a client's wallet (PayU or bank transfer) — `{ orgId, amountPaise, opId }` */
  topUpCredited: 'wallet.topup.credited',
  /** a client's available money fell below its threshold (once until back above) — `{ orgId, amountPaise }` (threshold) */
  lowBalance: 'wallet.account.low-balance',
  /** a client's credit went past its due date (once until the wallet is back to zero) — `{ orgId, amountPaise }` (used) */
  creditOverdue: 'wallet.credit.overdue',
  /** Stage 15: a hotel was paid in a payout run — `{ orgId, amountPaise, ref, bankReference }` (remittance) */
  payoutPaid: 'wallet.payout.paid',
});
