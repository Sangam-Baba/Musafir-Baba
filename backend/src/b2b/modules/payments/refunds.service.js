// @ts-check
/**
 * Refunds to the source (S07-T08). Steps, each repeat-safe, no transactions:
 *   1. the refund document (REQUESTED), unique per intent + key — asking again returns it;
 *   2. the amount reserved on the intent (conditional: never more than was paid; the refund id recorded once);
 *   3. PayU's refund API with **our** refund id (PayU never refunds the same id twice) → PENDING, or FAILED if refused;
 *   4. the poller asks PayU until final → SUCCEEDED (ledger: customer advances → gateway clearing; intent REFUNDED when
 *      fully refunded) or FAILED (reservation given back, exception for finance).
 * A step cut short is finished by the poller (`followRefunds`).
 */
import { randomInt } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { IntentRecord } from './models/intent.model.js';
import { RefundRecord } from './models/refund.model.js';
import { raiseException } from './exceptions.js';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const newRefundId = () => `RF${Array.from({ length: 14 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

/** @typedef {import('./payments.service.js').PaymentsDeps} PaymentsDeps */

/**
 * @param {PaymentsDeps} deps
 * @param {Record<string, any>} refund
 * @param {{ from: string[], to: string, note?: string | null, set?: Record<string, unknown>, event?: string }} m
 */
async function moveRefund(deps, refund, m) {
  const at = deps.clock.now();
  /** @type {Record<string, any>} */
  const update = { $set: { ...m.set, status: m.to }, $push: { history: { at, status: m.to, note: m.note ?? null } } };
  if (m.event) {
    update.$push.pendingEvents = newEvent(
      m.event,
      {
        orgId: refund.orgId ?? 'platform',
        refundId: refund.refundId,
        intentId: refund.intentId,
        txnId: refund.txnId,
        amountPaise: refund.amountPaise,
        key: refund.key,
      },
      deps,
    );
    update.$set.hasPendingEvents = true;
  }
  const res = await RefundRecord.updateOne({ _id: refund._id, status: { $in: m.from } }, update);
  return res.modifiedCount === 1;
}

/**
 * Reserve the refund on its payment (once per refund id; never above what was paid).
 * @param {Record<string, any>} refund
 */
async function reserve(refund) {
  const res = await IntentRecord.updateOne(
    {
      _id: refund.intentId,
      refundIds: { $ne: refund.refundId },
      $expr: { $lte: [{ $add: ['$refundedPaise', refund.amountPaise] }, '$amountPaise'] },
    },
    { $inc: { refundedPaise: refund.amountPaise }, $push: { refundIds: refund.refundId } },
  );
  if (res.modifiedCount === 1) return true;
  return (await IntentRecord.exists({ _id: refund.intentId, refundIds: refund.refundId })) !== null;
}

/**
 * Ask PayU to refund (step 3). Repeat-safe at PayU thanks to our refund id.
 * @param {PaymentsDeps} deps
 * @param {Record<string, any>} refund
 * @param {string} mihpayid
 */
async function askPayu(deps, refund, mihpayid) {
  if (!deps.payu) return;
  const r = await deps.payu.refund({ mihpayid, refundId: refund.refundId, amountPaise: refund.amountPaise });
  if (r.accepted)
    await moveRefund(deps, refund, {
      from: ['REQUESTED'],
      to: 'PENDING',
      set: { gatewayRequestId: r.requestId, gatewayMessage: r.message, lastCheckedAt: deps.clock.now() },
      note: r.message,
    });
  else await failRefund(deps, refund, r.message || 'PayU refused the refund');
}

/** @param {PaymentsDeps} deps @param {Record<string, any>} refund @param {string} why */
async function failRefund(deps, refund, why) {
  const moved = await moveRefund(deps, refund, {
    from: ['REQUESTED', 'PENDING'],
    to: 'FAILED',
    note: why,
    set: { gatewayMessage: why },
    event: EVENTS.refundFailed,
  });
  if (!moved) return;
  await IntentRecord.updateOne(
    { _id: refund.intentId, refundIds: refund.refundId },
    { $inc: { refundedPaise: -refund.amountPaise }, $pull: { refundIds: refund.refundId } },
  );
  await raiseException(deps, {
    kind: 'REFUND_FAILED',
    key: refund.refundId,
    txnId: refund.txnId,
    detail: why,
    amountPaise: refund.amountPaise,
  });
}

/**
 * PayU confirmed: ledger entry (once), then the payment REFUNDED when nothing is left of it.
 * @param {PaymentsDeps} deps
 * @param {Record<string, any>} refund
 */
export async function finishRefund(deps, refund) {
  await moveRefund(deps, refund, {
    from: ['PENDING', 'REQUESTED'],
    to: 'SUCCEEDED',
    set: { lastCheckedAt: deps.clock.now() },
    event: EVENTS.refundSucceeded,
  });
  if (!refund.journalPosted) {
    const [clearing, advances] = await Promise.all([
      deps.ledger.accountId('platform', 'GATEWAY_CLEARING'),
      deps.ledger.accountId('platform', 'CUSTOMER_ADVANCES'),
    ]);
    await deps.ledger.post(
      {
        reference: { type: 'refund', id: refund.refundId },
        purpose: 'refund-paid',
        lines: [
          { accountId: advances, debitPaise: refund.amountPaise },
          { accountId: clearing, creditPaise: refund.amountPaise },
        ],
        memo: `Refund of ${refund.txnId}`,
      },
      'system:payments',
    );
    await RefundRecord.updateOne({ _id: refund._id }, { $set: { journalPosted: true } });
  }
  await IntentRecord.updateOne(
    { _id: refund.intentId, status: { $in: ['SUCCEEDED', 'FAILED'] }, $expr: { $gte: ['$refundedPaise', '$amountPaise'] } },
    { $set: { status: 'REFUNDED' } },
  );
}

/**
 * Refund (part of) a confirmed payment to its source. Repeat-safe per intent + key.
 * @param {PaymentsDeps} deps
 * @param {{ intentId: string, amountPaise: number, key: string, reason: string, by: string }} a
 */
export async function refundPayment(deps, a) {
  const existing = await RefundRecord.findOne({ intentId: a.intentId, key: a.key }).lean();
  if (existing) return existing;
  const intent = /^[a-f0-9]{24}$/.test(a.intentId) ? await IntentRecord.findById(a.intentId).lean() : null;
  if (!intent) throw new NotFoundError('PAYMENT_NOT_FOUND');
  if (!intent.gatewayPaymentId || !['SUCCEEDED', 'FAILED'].includes(intent.status))
    throw new DomainError('PAYMENT_NOT_REFUNDABLE', { status: intent.status });
  if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise < 1 || intent.refundedPaise + a.amountPaise > intent.amountPaise)
    throw new DomainError('REFUND_TOO_LARGE', { refundablePaise: intent.amountPaise - intent.refundedPaise });
  const doc = {
    refundId: newRefundId(),
    intentId: a.intentId,
    txnId: intent.txnId,
    key: a.key,
    amountPaise: a.amountPaise,
    reason: a.reason,
    status: 'REQUESTED',
    requestedBy: a.by,
    history: [{ at: deps.clock.now(), status: 'REQUESTED', note: a.reason }],
  };
  const created = await RefundRecord.create(doc).catch(async (error) => {
    if (/** @type {any} */ (error)?.code !== 11000) throw error;
    return RefundRecord.findOne({ intentId: a.intentId, key: a.key });
  });
  const refund = /** @type {Record<string, any>} */ (created?.toObject());
  if (!(await reserve(refund))) {
    await moveRefund(deps, refund, { from: ['REQUESTED'], to: 'FAILED', note: 'more than what is left of the payment' });
    throw new ConflictError('REFUND_TOO_LARGE');
  }
  await askPayu(deps, refund, intent.gatewayPaymentId).catch((error) =>
    deps.logger.warn({ err: error, refundId: refund.refundId }, 'payments: refund request failed — the poller will retry'),
  );
  return RefundRecord.findById(refund._id).lean();
}

/**
 * Poller step: send refunds still REQUESTED (repeat-safe at PayU), follow PENDING ones, finish ledger entries.
 * @param {PaymentsDeps} deps
 */
export async function followRefunds(deps) {
  const open = await RefundRecord.find({
    $or: [{ status: { $in: ['REQUESTED', 'PENDING'] } }, { status: 'SUCCEEDED', journalPosted: false }],
  })
    .limit(50)
    .lean();
  for (const r of open) {
    if (r.status === 'SUCCEEDED') await finishRefund(deps, r);
    else if (r.status === 'REQUESTED') {
      const intent = await IntentRecord.findById(r.intentId, { gatewayPaymentId: 1 }).lean();
      if ((await reserve(r)) && intent?.gatewayPaymentId) await askPayu(deps, r, intent.gatewayPaymentId);
    } else if (r.gatewayRequestId && deps.payu) {
      const s = await deps.payu.refundStatus(r.gatewayRequestId);
      await RefundRecord.updateOne({ _id: r._id }, { $set: { lastCheckedAt: deps.clock.now() }, $inc: { attempts: 1 } });
      if (s.status === 'SUCCESS') await finishRefund(deps, r);
      else if (s.status === 'FAILURE') await failRefund(deps, r, s.raw || 'PayU reported the refund failed');
    }
  }
  return open.length;
}
