// @ts-check
/**
 * Payments (S07-T06). `createIntent` stores our amount and gives back the PayU form (hosted checkout — card data
 * never reaches us). PayU sends the browser back to `POST /payments/payu/callback`: the message is kept once
 * (`txnId + status`), its hash checked, and the intent processed. **Processing never trusts the callback**: it asks
 * PayU's verify API and acts only on PayU's answer with our amount and transaction id. Success → SUCCEEDED + event
 * + ledger entry (gateway clearing ← customer advances). Failure → FAILED. Pending → left for the poller (S07-T07).
 * Final statuses never move back; every change is conditional on the status read.
 */
import { randomInt } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { DomainError, ServiceUnavailableError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { requestHash, responseHashValid, toRupees, TXN_PREFIX } from './domain/payu.js';
import { PaymentInboxRecord } from './models/inbox.model.js';
import { IntentRecord } from './models/intent.model.js';
import { ReconExceptionRecord } from './models/recon-exception.model.js';
import { paymentUrl } from './payu-client.js';

export const PAYMENT_WINDOW_MINUTES = 30;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PREFIX = { ...TXN_PREFIX, TEST: 'B2BT' };
const FINAL = ['SUCCEEDED', 'FAILED', 'REFUNDED'];

/**
 * @typedef {import('./payu-client.js').PayuMerchant} PayuMerchant
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   logger: import('../../core/logger.js').Logger,
 *   merchant: PayuMerchant | null,
 *   payu: ReturnType<typeof import('./payu-client.js').createPayuClient> | null,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger>,
 *   callbackUrl: string | null,
 * }} PaymentsDeps
 * @typedef {{ purpose: 'ORDER' | 'TOPUP' | 'SUBSCRIPTION' | 'TEST', reference: { type: string, id: string }, amountPaise: number,
 *   productinfo: string, payer: { firstname: string, email: string, phone?: string | null }, returnUrl: string,
 *   orgId?: string | null, customerId?: string | null, createdBy: string }} IntentInput
 */

/** @param {keyof typeof PREFIX} purpose */
const newTxnId = (purpose) => `${PREFIX[purpose]}${Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

/** @param {PaymentsDeps} deps */
function configured(deps) {
  if (!deps.merchant || !deps.payu || !deps.callbackUrl) throw new ServiceUnavailableError('PAYMENTS_NOT_CONFIGURED');
  return { merchant: deps.merchant, payu: deps.payu, callbackUrl: deps.callbackUrl };
}

/**
 * One exception per kind + key (repeat-safe).
 * @param {PaymentsDeps} deps
 * @param {{ kind: string, key: string, txnId?: string | null, detail: string, amountPaise?: number | null }} e
 */
export async function raiseException(deps, e) {
  await ReconExceptionRecord.updateOne(
    { kind: e.kind, key: e.key },
    { $setOnInsert: { ...e, txnId: e.txnId ?? null, amountPaise: e.amountPaise ?? null, status: 'OPEN', raisedAt: deps.clock.now() } },
    { upsert: true },
  );
  deps.logger.warn({ kind: e.kind, txnId: e.txnId }, 'payments: reconciliation exception');
}

/**
 * Move an intent from one of `from` to `to`, with history, optional event and fields. Returns true when it moved.
 * @param {PaymentsDeps} deps
 * @param {Record<string, any>} intent
 * @param {{ from: string[], to: string, source: string, note?: string | null, set?: Record<string, unknown>, event?: string }} m
 */
async function moveIntent(deps, intent, m) {
  const at = deps.clock.now();
  /** @type {Record<string, any>} */
  const update = {
    $set: { ...m.set, status: m.to },
    $inc: { version: 1 },
    $push: { history: { at, status: m.to, source: m.source, note: m.note ?? null } },
  };
  if (m.event) {
    const payload = {
      orgId: intent.orgId ?? 'platform',
      intentId: String(intent._id),
      txnId: intent.txnId,
      purpose: intent.purpose,
      reference: intent.reference,
      amountPaise: intent.amountPaise,
    };
    update.$push.pendingEvents = newEvent(m.event, payload, deps);
    update.$set.hasPendingEvents = true;
  }
  const res = await IntentRecord.updateOne({ _id: intent._id, status: { $in: m.from } }, update);
  return res.modifiedCount === 1;
}

/**
 * The ledger entry for a confirmed payment (repeat-safe by reference), then the flag.
 * @param {PaymentsDeps} deps
 * @param {Record<string, any>} intent
 */
export async function postPaymentReceived(deps, intent) {
  const [clearing, advances] = await Promise.all([
    deps.ledger.accountId('platform', 'GATEWAY_CLEARING'),
    deps.ledger.accountId('platform', 'CUSTOMER_ADVANCES'),
  ]);
  await deps.ledger.post(
    {
      reference: { type: 'pay-intent', id: intent.txnId },
      purpose: 'payment-received',
      lines: [
        { accountId: clearing, debitPaise: intent.amountPaise },
        { accountId: advances, creditPaise: intent.amountPaise },
      ],
      memo: `PayU ${intent.gatewayPaymentId ?? ''}`.trim(),
    },
    'system:payments',
  );
  await IntentRecord.updateOne({ _id: intent._id }, { $set: { journalPosted: true } });
}

/**
 * Ask PayU and act on its answer. Repeat-safe; never moves a final status back.
 * @param {PaymentsDeps} deps
 * @param {string} txnId
 * @param {'CALLBACK' | 'POLL'} source
 */
export async function processIntent(deps, txnId, source) {
  const { payu } = configured(deps);
  const intent = await IntentRecord.findOne({ txnId }).lean();
  if (!intent || FINAL.includes(intent.status)) return intent?.status ?? 'NOT_FOUND';
  const v = await payu.verify(txnId); // network — not between database steps
  const now = deps.clock.now();
  if (v.status === 'SUCCESS') {
    if (v.txnid !== intent.txnId || v.amountPaise !== intent.amountPaise) {
      await raiseException(deps, {
        kind: 'AMOUNT_MISMATCH',
        key: txnId,
        txnId,
        detail: `PayU confirmed ${v.amountPaise} paise for an intent of ${intent.amountPaise}`,
        amountPaise: v.amountPaise,
      });
      await moveIntent(deps, intent, {
        from: ['CREATED', 'PENDING'],
        to: 'FAILED',
        source,
        note: 'amount mismatch — finance to refund',
        set: { failureReason: 'AMOUNT_MISMATCH', gatewayPaymentId: v.mihpayid, lastVerifiedAt: now },
        event: EVENTS.intentFailed,
      });
      return 'FAILED';
    }
    const moved = await moveIntent(deps, intent, {
      from: ['CREATED', 'PENDING'],
      to: 'SUCCEEDED',
      source,
      set: { gatewayPaymentId: v.mihpayid, mode: v.mode, lastVerifiedAt: now },
      event: EVENTS.intentSucceeded,
    });
    if (moved) await postPaymentReceived(deps, { ...intent, gatewayPaymentId: v.mihpayid });
    return 'SUCCEEDED';
  }
  if (v.status === 'FAILURE' || (v.status === 'NOT_FOUND' && now > intent.windowEndsAt)) {
    const reason = v.status === 'FAILURE' ? 'PAYU_FAILURE' : 'ABANDONED';
    await moveIntent(deps, intent, {
      from: ['CREATED', 'PENDING'],
      to: 'FAILED',
      source,
      set: { failureReason: reason, lastVerifiedAt: now },
      event: EVENTS.intentFailed,
    });
    return 'FAILED';
  }
  await IntentRecord.updateOne(
    { _id: intent._id, status: { $in: ['CREATED', 'PENDING'] } },
    { $set: { lastVerifiedAt: now }, $inc: { verifyAttempts: 1 } },
  );
  return intent.status;
}

/**
 * PayU's browser return: keep the message once, check its hash, process (verify API). Returns where to send the browser.
 * @param {PaymentsDeps} deps
 * @param {Record<string, string | undefined>} posted
 */
async function handleCallback(deps, posted) {
  const { merchant } = configured(deps);
  const txnId = String(posted.txnid ?? '');
  const intent = /^B2B[HWST][2-9A-Z]{12}$/.test(txnId) ? await IntentRecord.findOne({ txnId }, { returnUrl: 1 }).lean() : null;
  if (!intent) return { redirect: null, status: 'UNKNOWN' };
  const hashValid = responseHashValid(posted, merchant);
  const status = String(posted.status ?? '').toLowerCase();
  await PaymentInboxRecord.updateOne(
    { dedupeKey: `${txnId}:${status}` },
    {
      $setOnInsert: {
        txnId,
        source: 'CALLBACK',
        status,
        hashValid,
        amount: posted.amount ?? null,
        mihpayid: posted.mihpayid ?? null,
        receivedAt: deps.clock.now(),
      },
    },
    { upsert: true },
  );
  if (!hashValid) deps.logger.warn({ txnId }, 'payments: callback with a bad hash — PayU will be asked by the poller');
  const result = hashValid
    ? await processIntent(deps, txnId, 'CALLBACK').catch(
        (error) => (deps.logger.warn({ err: error, txnId }, 'payments: verify failed — the poller will retry'), 'PENDING'),
      )
    : 'PENDING';
  await PaymentInboxRecord.updateOne({ dedupeKey: `${txnId}:${status}` }, { $set: { processedAt: deps.clock.now() } });
  return { redirect: intent.returnUrl, status: result };
}

/** @param {PaymentsDeps} deps */
export function createPayments(deps) {
  return {
    /**
     * A new intent and the PayU form the browser posts (hosted checkout).
     * @param {IntentInput} input
     */
    async createIntent(input) {
      const { merchant, callbackUrl } = configured(deps);
      if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1) throw new DomainError('AMOUNT_INVALID');
      const txnId = newTxnId(input.purpose);
      const now = deps.clock.now();
      const intent = await IntentRecord.create({
        ...input,
        txnId,
        orgId: input.orgId ?? null,
        customerId: input.customerId ?? null,
        payer: { firstname: input.payer.firstname, email: input.payer.email, phone: input.payer.phone ?? '' },
        status: 'PENDING',
        windowEndsAt: new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60_000),
        history: [{ at: now, status: 'PENDING', source: 'CREATE', note: null }],
      });
      const fields = {
        key: merchant.key,
        txnid: txnId,
        amount: toRupees(input.amountPaise),
        productinfo: input.productinfo,
        firstname: input.payer.firstname,
        email: input.payer.email,
        phone: input.payer.phone ?? '',
        surl: callbackUrl,
        furl: callbackUrl,
        udf1: String(intent._id),
      };
      return {
        intentId: String(intent._id),
        txnId,
        action: paymentUrl(merchant),
        fields: { ...fields, hash: requestHash(fields, merchant) },
      };
    },

    /** PayU's browser return (see `handleCallback`). @param {Record<string, string | undefined>} posted */
    handleCallback: (posted) => handleCallback(deps, posted),
  };
}
