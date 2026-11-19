// @ts-check
/** Refunds and the poller (S07-T07, T08): partial, repeat-safe, refused, cut short; pending resolved; paid late → refunded once. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createPayments,
  followRefunds,
  IntentRecord,
  PaymentInboxRecord,
  pollPayments,
  ReconExceptionRecord,
  refundPayment,
  RefundRecord,
} from '../../src/b2b/modules/payments/index.js';
import { AccountRecord, createLedger, seedPlatformAccounts, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-19T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const merchant = { key: 'gtKFFx', salt: 'eCwWELxi', env: /** @type {const} */ ('test') };
const logger = createLogger({ write: () => {} });
/** @type {Map<string, { status: string, amountPaise?: number }>} */
const verifyAnswers = new Map();
/** @type {{ mihpayid: string, refundId: string, amountPaise: number }[]} */
let refundCalls = [];
let refundAccepted = true;
let refundStatusAnswer = 'PENDING';
const payu = /** @type {any} */ ({
  verify: async (/** @type {string} */ txnid) => {
    const a = verifyAnswers.get(txnid) ?? { status: 'NOT_FOUND' };
    return {
      status: a.status,
      txnid,
      mihpayid: a.status === 'SUCCESS' ? `MIH-${txnid}` : null,
      amountPaise: a.amountPaise ?? 0,
      mode: 'CC',
    };
  },
  refund: async (/** @type {any} */ a) => {
    refundCalls.push(a);
    return refundAccepted
      ? { accepted: true, requestId: `REQ-${a.refundId}`, message: 'Refund Request Queued' }
      : { accepted: false, requestId: null, message: 'Refund amount exceeds' };
  },
  refundStatus: async () => ({ status: refundStatusAnswer, raw: '' }),
});
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {any} */
let deps;
/** @type {ReturnType<typeof createPayments>} */
let payments;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-19T10:00:00Z');
  verifyAnswers.clear();
  refundCalls = [];
  refundAccepted = true;
  refundStatusAnswer = 'PENDING';
  await Promise.all([
    IntentRecord.deleteMany({}),
    RefundRecord.deleteMany({}),
    PaymentInboxRecord.deleteMany({}),
    ReconExceptionRecord.deleteMany({}),
    TransactionRecord.deleteMany({}),
    AccountRecord.deleteMany({}).setOptions(SYSTEM),
  ]);
  await seedPlatformAccounts();
  deps = { clock, logger, merchant, payu, ledger: createLedger({ clock }), callbackUrl: 'https://api.test/api/v1/payments/payu/callback' };
  payments = createPayments(deps);
});

const intent = () =>
  payments.createIntent({
    purpose: 'ORDER',
    reference: { type: 'order', id: 'MBO-1' },
    amountPaise: 99750,
    productinfo: 'Hotel booking',
    payer: { firstname: 'Asha', email: 'a@example.com' },
    returnUrl: 'https://musafirbaba.com/r',
    createdBy: 'customer:1',
  });
/** A paid intent (via the poller, as if the browser never came back). */
async function paid() {
  const i = await intent();
  verifyAnswers.set(i.txnId, { status: 'SUCCESS', amountPaise: 99750 });
  nowMs += 2 * 60_000;
  await pollPayments(deps);
  return i;
}
const entries = (/** @type {string} */ purpose) => TransactionRecord.find({ purpose }).lean();

describe('poller', () => {
  it('resolves a payment whose browser never came back; finishes a ledger entry cut short', async () => {
    const i = await paid();
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.status).toBe('SUCCEEDED');
    expect(await entries('payment-received')).toHaveLength(1);
    await IntentRecord.updateOne({ txnId: i.txnId }, { $set: { journalPosted: false } }); // as if cut short after the status
    await pollPayments(deps);
    expect(await entries('payment-received')).toHaveLength(1); // the entry exists once; the flag is set again
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.journalPosted).toBe(true);
  });

  it('paid after its window: the money is recorded, finance told, refunded to the source once', async () => {
    const i = await intent();
    nowMs += 31 * 60_000;
    await pollPayments(deps); // PayU: not found → abandoned
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.failureReason).toBe('ABANDONED');
    verifyAnswers.set(i.txnId, { status: 'SUCCESS', amountPaise: 99750 }); // the customer paid anyway
    nowMs += 61 * 60_000;
    await pollPayments(deps);
    expect(await entries('payment-received')).toHaveLength(1);
    expect(await ReconExceptionRecord.findOne({ kind: 'LATE_SUCCESS', key: i.txnId }).lean()).toBeTruthy();
    expect(await RefundRecord.find({ txnId: i.txnId }).lean()).toEqual([
      expect.objectContaining({ key: 'late-success', amountPaise: 99750, status: 'PENDING' }),
    ]);
    nowMs += 61 * 60_000;
    await pollPayments(deps);
    expect(refundCalls).toHaveLength(1); // never twice
  });
});

describe('refunds', () => {
  it('partial refunds to the source; the same request twice → one refund; never above what was paid; fully refunded → REFUNDED', async () => {
    const i = await paid();
    const r1 = await refundPayment(deps, {
      intentId: i.intentId,
      amountPaise: 50000,
      key: 'cancel:b1',
      reason: 'Cancelled',
      by: 'staff:1',
    });
    expect(r1).toMatchObject({ status: 'PENDING', gatewayRequestId: expect.stringMatching(/^REQ-RF/) });
    expect(
      (await refundPayment(deps, { intentId: i.intentId, amountPaise: 50000, key: 'cancel:b1', reason: 'Cancelled', by: 'staff:1' }))
        ?.refundId,
    ).toBe(r1?.refundId);
    expect(refundCalls).toEqual([{ mihpayid: `MIH-${i.txnId}`, refundId: r1?.refundId, amountPaise: 50000 }]);
    await expect(refundPayment(deps, { intentId: i.intentId, amountPaise: 50000, key: 'cancel:b2', reason: 'x', by: 's' })).rejects.toThrow(
      /REFUND_TOO_LARGE/,
    );
    await refundPayment(deps, { intentId: i.intentId, amountPaise: 49750, key: 'cancel:b3', reason: 'Rest', by: 's' });
    refundStatusAnswer = 'SUCCESS';
    await followRefunds(deps);
    expect(await RefundRecord.countDocuments({ status: 'SUCCEEDED' })).toBe(2);
    const paidBack = await entries('refund-paid');
    expect(paidBack.map((e) => e.lines.map((l) => [l.debitPaise, l.creditPaise]))).toEqual(
      expect.arrayContaining([
        [
          [50000, 0],
          [0, 50000],
        ],
        [
          [49750, 0],
          [0, 49750],
        ],
      ]),
    );
    expect(await IntentRecord.findOne({ txnId: i.txnId }).lean()).toMatchObject({ status: 'REFUNDED', refundedPaise: 99750 });
    await followRefunds(deps);
    expect(await entries('refund-paid')).toHaveLength(2);
  });

  it('PayU refuses → FAILED, the amount is free again, finance told', async () => {
    const i = await paid();
    refundAccepted = false;
    const r = await refundPayment(deps, { intentId: i.intentId, amountPaise: 99750, key: 'cancel:b1', reason: 'x', by: 's' });
    expect(r?.status).toBe('FAILED');
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.refundedPaise).toBe(0);
    expect(await ReconExceptionRecord.findOne({ kind: 'REFUND_FAILED', key: r?.refundId }).lean()).toBeTruthy();
  });

  it('cut short before PayU was asked: the poller asks once, never reserving twice', async () => {
    const i = await paid();
    const stored = /** @type {any} */ (await IntentRecord.findOne({ txnId: i.txnId }).lean());
    await RefundRecord.create({
      refundId: 'RFCUTSHORT0000001',
      intentId: String(stored._id),
      txnId: i.txnId,
      key: 'cancel:b9',
      amountPaise: 30000,
      reason: 'x',
      status: 'REQUESTED',
      requestedBy: 's',
    });
    await followRefunds(deps);
    await followRefunds(deps);
    expect(refundCalls.filter((c) => c.refundId === 'RFCUTSHORT0000001')).toHaveLength(1);
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.refundedPaise).toBe(30000);
  });

  it('only a confirmed payment can be refunded', async () => {
    const i = await intent();
    await expect(refundPayment(deps, { intentId: i.intentId, amountPaise: 100, key: 'k', reason: 'x', by: 's' })).rejects.toThrow(
      /PAYMENT_NOT_REFUNDABLE/,
    );
  });
});
