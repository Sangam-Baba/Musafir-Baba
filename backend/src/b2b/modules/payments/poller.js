// @ts-check
/**
 * The payments poller (S07-T07), every 2 minutes, lease-locked:
 * - open intents not checked for 2 minutes (and at least a minute old, so the browser return usually comes first)
 *   → PayU's verify API → resolved like a callback;
 * - successes whose ledger entry was cut short → entry posted;
 * - payments given up on in the last 72 hours, re-checked hourly → paid late = refunded once;
 * - refunds still being sent or followed (`followRefunds`).
 * One failing item never stops the others.
 */
import { IntentRecord } from './models/intent.model.js';
import { PAYMENT_WINDOW_MINUTES, postPaymentReceived, processIntent } from './payments.service.js';
import { followRefunds } from './refunds.service.js';

export const POLL_EVERY_MS = 2 * 60_000;

/** @param {import('./payments.service.js').PaymentsDeps} deps */
export async function pollPayments(deps) {
  if (!deps.payu) return { checked: 0 };
  const now = deps.clock.now().getTime();
  const minutes = (/** @type {number} */ n) => new Date(now - n * 60_000);
  const open = await IntentRecord.find(
    {
      status: { $in: ['CREATED', 'PENDING'] },
      windowEndsAt: { $lte: minutes(1 - PAYMENT_WINDOW_MINUTES) }, // at least a minute old (our clock, not the database's)
      $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lte: minutes(2) } }],
    },
    { txnId: 1 },
  )
    .limit(50)
    .lean();
  const late = await IntentRecord.find(
    {
      status: 'FAILED',
      failureReason: 'ABANDONED',
      gatewayPaymentId: null,
      windowEndsAt: { $gte: minutes(72 * 60) },
      lastVerifiedAt: { $lte: minutes(60) },
    },
    { txnId: 1 },
  )
    .limit(20)
    .lean();
  const unposted = await IntentRecord.find({ status: { $in: ['SUCCEEDED', 'REFUNDED'] }, journalPosted: false })
    .limit(50)
    .lean();
  let checked = 0;
  for (const i of [...open, ...late]) {
    checked += 1;
    await processIntent(deps, i.txnId, 'POLL').catch((error) => deps.logger.warn({ err: error, txnId: i.txnId }, 'payments: poll failed'));
  }
  for (const i of unposted)
    await postPaymentReceived(deps, i).catch((error) => deps.logger.warn({ err: error, txnId: i.txnId }, 'payments: ledger entry failed'));
  await followRefunds(deps).catch((error) => deps.logger.warn({ err: error }, 'payments: following refunds failed'));
  return { checked };
}
