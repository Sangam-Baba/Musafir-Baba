// @ts-check
/** Reconciliation (S07-T09): sample settlement file → matched lines posted once, clearing back to zero, differences raised. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createPayments,
  flagUnsettled,
  followRefunds,
  IntentRecord,
  pollPayments,
  reconcileSettlements,
  ReconExceptionRecord,
  refundPayment,
  RefundRecord,
  SettlementRecord,
} from '../../src/b2b/modules/payments/index.js';
import {
  AccountRecord,
  BalanceSnapshotRecord,
  balancesOf,
  createLedger,
  rollUpBalances,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-19T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const logger = createLogger({ write: () => {} });
/** @type {Map<string, number>} txnid → amount PayU confirms */
const paidAt = new Map();
const payu = /** @type {any} */ ({
  verify: async (/** @type {string} */ txnid) =>
    paidAt.has(txnid)
      ? { status: 'SUCCESS', txnid, mihpayid: `M${txnid}`, amountPaise: paidAt.get(txnid), mode: 'UPI' }
      : { status: 'NOT_FOUND', txnid, mihpayid: null, amountPaise: 0, mode: null },
  refund: async (/** @type {any} */ a) => ({ accepted: true, requestId: `REQ-${a.refundId}`, message: 'ok' }),
  refundStatus: async () => ({ status: 'SUCCESS', raw: '' }),
});
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {any} */
let deps;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-19T10:00:00Z');
  paidAt.clear();
  await Promise.all([
    IntentRecord.deleteMany({}),
    RefundRecord.deleteMany({}),
    SettlementRecord.deleteMany({}),
    ReconExceptionRecord.deleteMany({}),
    TransactionRecord.deleteMany({}),
    BalanceSnapshotRecord.deleteMany({}),
    AccountRecord.deleteMany({}).setOptions(SYSTEM),
  ]);
  await seedPlatformAccounts();
  deps = {
    clock,
    logger,
    merchant: { key: 'k', salt: 's', env: 'test' },
    payu,
    ledger: createLedger({ clock }),
    callbackUrl: 'https://api.test/cb',
  };
});

/** A payment confirmed through the poller. @param {number} amountPaise */
async function paidIntent(amountPaise) {
  const i = await createPayments(deps).createIntent({
    purpose: 'ORDER',
    reference: { type: 'order', id: `o-${amountPaise}` },
    amountPaise,
    productinfo: 'Hotel booking',
    payer: { firstname: 'A', email: 'a@x.in' },
    returnUrl: 'https://musafirbaba.com/r',
    createdBy: 'c',
  });
  paidAt.set(i.txnId, amountPaise);
  nowMs += 2 * 60_000;
  await pollPayments(deps);
  return i;
}
/** @param {string} txnid @param {number} amount @param {number} fee @param {string} [action] */
const line = (txnid, amount, fee, action = 'capture') => {
  const tax = Math.round(fee * 0.18);
  return {
    txnid,
    mihpayid: `M${txnid}`,
    amountPaise: amount,
    feePaise: fee,
    taxPaise: tax,
    settledPaise: action === 'refund' ? 0 : amount - fee - tax,
    utr: 'UTR1',
    action,
    settledOn: '2026-11-20',
  };
};

describe('settlement file', () => {
  it('matched lines posted once; PayU clearing back to zero for them; existing website lines ignored; differences raised', async () => {
    const a = await paidIntent(99750);
    const b = await paidIntent(178500);
    await refundPayment(deps, { intentId: b.intentId, amountPaise: 50000, key: 'cancel:1', reason: 'x', by: 's' });
    await followRefunds(deps);
    const file = [
      line(a.txnId, 99750, 1995),
      line(b.txnId, 178500, 3570),
      { ...line(b.txnId, 50000, 0, 'refund') },
      { ...line('txn98765', 450000, 9000) }, // the existing website's package payment on the same PayU account
      line('B2BHZZZZZZZZZZZZ', 10000, 200), // ours by its name, but no such payment
    ];
    const r = await reconcileSettlements(deps, file, 'FILE');
    expect(r).toEqual({ lines: 5, ours: 4, matched: 3, exceptions: 1 });
    expect(await SettlementRecord.countDocuments({ txnId: 'txn98765' })).toBe(0);
    expect(await ReconExceptionRecord.find({}).lean()).toEqual([
      expect.objectContaining({ kind: 'SETTLEMENT_UNMATCHED', txnId: 'B2BHZZZZZZZZZZZZ' }),
    ]);
    await rollUpBalances({ clock });
    const all = await balancesOf();
    const bal = (/** @type {string} */ type) => all.find((x) => x.type === type)?.balancePaise;
    expect(bal('GATEWAY_CLEARING')).toBe(0); // everything PayU owed us is explained: settled, fees, refund taken back
    expect(bal('GATEWAY_FEES')).toBe(1995 + 359 + 3570 + 643);
    expect(bal('BANK')).toBe(99750 - 1995 - 359 + (178500 - 3570 - 643) - 50000);
    expect(bal('CUSTOMER_ADVANCES')).toBe(99750 + 178500 - 50000);
    const again = await reconcileSettlements(deps, file, 'FILE');
    expect(again.matched).toBe(3);
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'settlement' })).toBe(5); // per payment a fee + a bank entry, plus the refund taken back — once each
  });

  it("a settled amount that differs, or fees that don't add up, are raised and not posted", async () => {
    const a = await paidIntent(99750);
    const b = await paidIntent(50000);
    await reconcileSettlements(deps, [line(a.txnId, 90000, 1800), { ...line(b.txnId, 50000, 1000), settledPaise: 1 }], 'FILE');
    expect((await ReconExceptionRecord.find({}).lean()).map((e) => e.kind).sort()).toEqual(['SETTLEMENT_AMOUNT', 'SETTLEMENT_AMOUNT']);
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'settlement' })).toBe(0);
  });

  it('a payment with no settlement after 3 days is raised once', async () => {
    await paidIntent(99750);
    nowMs += 4 * 86_400_000;
    expect(await flagUnsettled(deps)).toBe(1);
    await flagUnsettled(deps);
    expect(await ReconExceptionRecord.countDocuments({ kind: 'NOT_SETTLED' })).toBe(1);
  });
});
