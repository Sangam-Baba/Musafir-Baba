// @ts-check
/**
 * Stage 07 mandatory tests (plan §8). Where each one lives:
 * - ledger invariants (property) → wallet-ledger.test.js ("randomised: 300 balanced entries"), and here end to end:
 *   random payments, refunds and a settlement file → the books balance, PayU clearing explained, snapshots = journal;
 * - PayU hash → payments-payu.test.js (request / response / API hashes against the existing formula), bad hash →
 *   payments-intents.test.js; replay → here (same message again, or moved to another payment / amount);
 * - out of order → payments-intents.test.js ("a failure arriving after the success never moves it back");
 * - pending → poller resolves → payments-intents.test.js, payments-refunds.test.js ("browser never came back");
 * - success after the window → refund once → payments-refunds.test.js ("paid after its window");
 * - refund idempotency → payments-refunds.test.js (same request twice, cut short, never above what was paid),
 *   finance-admin.test.js (manual refund by request id);
 * - reconciliation with sample settlement files → payments-reconciliation.test.js, and here with random files.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createPayments,
  expectedResponseHash,
  followRefunds,
  IntentRecord,
  PaymentInboxRecord,
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
  ledgerInvariants,
  rollUpBalances,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const merchant = { key: 'gtKFFx', salt: 'eCwWELxi', env: /** @type {const} */ ('test') };
/** @type {Map<string, number>} txnid → amount PayU confirms */
const paid = new Map();
const payu = /** @type {any} */ ({
  verify: async (/** @type {string} */ txnid) =>
    paid.has(txnid)
      ? { status: 'SUCCESS', txnid, mihpayid: `M${txnid}`, amountPaise: paid.get(txnid), mode: 'UPI' }
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
  paid.clear();
  await Promise.all([
    IntentRecord.deleteMany({}),
    PaymentInboxRecord.deleteMany({}),
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
    logger: createLogger({ write: () => {} }),
    merchant,
    payu,
    ledger: createLedger({ clock }),
    callbackUrl: 'https://api.test/cb',
  };
});

/** Small seeded random numbers, so a failure can be repeated. @param {number} seed */
function random(seed) {
  let s = seed;
  return (/** @type {number} */ min, /** @type {number} */ max) => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return min + (s % (max - min + 1));
  };
}
/** @param {number} amountPaise @param {string} id */
const newIntent = (amountPaise, id) =>
  createPayments(deps).createIntent({
    purpose: 'ORDER',
    reference: { type: 'order', id },
    amountPaise,
    productinfo: `Hotel booking ${id}`,
    payer: { firstname: 'Asha', email: 'asha@example.com' },
    returnUrl: 'https://musafirbaba.com/r',
    createdBy: 'customer:1',
  });
/** PayU's browser post, signed like PayU would. @param {any} i */
const signedSuccess = (i) => {
  const p = { ...i.fields, status: 'success', mihpayid: `M${i.txnId}` };
  return { ...p, hash: expectedResponseHash(p, merchant) };
};

describe('ledger invariants, end to end (property)', () => {
  for (const seed of [7, 2026, 99_991])
    it(`seed ${seed}: random payments, refunds and settlement → books balance, PayU clearing explained, snapshots = journal`, async () => {
      const rnd = random(seed);
      let refunded = 0;
      let settledToBank = 0;
      let fees = 0;
      let total = 0;
      /** @type {any[]} */
      const file = [];
      for (let n = 0; n < 12; n += 1) {
        const amount = rnd(100, 2_000_000);
        const i = await newIntent(amount, `o-${seed}-${n}`);
        paid.set(i.txnId, amount);
        expect((await createPayments(deps).handleCallback(signedSuccess(i))).status).toBe('SUCCEEDED');
        total += amount;
        const fee = Math.floor(amount * 0.02);
        const tax = Math.round(fee * 0.18);
        file.push({
          txnid: i.txnId,
          mihpayid: `M${i.txnId}`,
          amountPaise: amount,
          feePaise: fee,
          taxPaise: tax,
          settledPaise: amount - fee - tax,
          utr: 'U',
          action: 'capture',
          settledOn: '2026-11-20',
        });
        fees += fee + tax;
        settledToBank += amount - fee - tax;
        if (rnd(0, 2) === 0) {
          const back = rnd(1, amount);
          await refundPayment(deps, { intentId: i.intentId, amountPaise: back, key: `cancel:${n}`, reason: 'Cancelled', by: 'staff:1' });
          file.push({
            txnid: i.txnId,
            mihpayid: `M${i.txnId}`,
            amountPaise: back,
            feePaise: 0,
            taxPaise: 0,
            settledPaise: 0,
            utr: null,
            action: 'refund',
            settledOn: '2026-11-21',
          });
          refunded += back;
        }
      }
      await followRefunds(deps);
      expect(await reconcileSettlements(deps, file, 'FILE')).toMatchObject({ exceptions: 0 });
      await reconcileSettlements(deps, file, 'FILE'); // the same file again changes nothing
      await rollUpBalances({ clock });
      const all = await balancesOf();
      expect(all.reduce((s, a) => s + a.debitPaise, 0)).toBe(all.reduce((s, a) => s + a.creditPaise, 0));
      const bal = (/** @type {string} */ type) => all.find((a) => a.type === type)?.balancePaise ?? 0;
      expect(bal('GATEWAY_CLEARING')).toBe(0);
      expect(bal('CUSTOMER_ADVANCES')).toBe(total - refunded);
      expect(bal('GATEWAY_FEES')).toBe(fees);
      expect(bal('BANK')).toBe(settledToBank - refunded);
      for (const inv of ledgerInvariants()) expect(await inv.check()).toEqual([]);
      for (const t of await TransactionRecord.find({}).lean()) {
        expect(t.lines.reduce((s, l) => s + (l.debitPaise ?? 0), 0)).toBe(t.lines.reduce((s, l) => s + (l.creditPaise ?? 0), 0));
      }
    });
});

describe('replay', () => {
  it('the same PayU message again → nothing new; moved to another payment or amount → the hash fails, nothing acted on', async () => {
    const a = await newIntent(99750, 'o-a');
    const b = await newIntent(99750, 'o-b');
    paid.set(a.txnId, 99750);
    paid.set(b.txnId, 99750); // even if PayU would confirm b, a copied message must not be what confirms it
    const message = signedSuccess(a);
    const payments = createPayments(deps);
    expect((await payments.handleCallback(message)).status).toBe('SUCCEEDED');
    expect((await payments.handleCallback(message)).status).toBe('SUCCEEDED');
    expect(await PaymentInboxRecord.countDocuments({ txnId: a.txnId })).toBe(1);
    expect(await TransactionRecord.countDocuments({ purpose: 'payment-received' })).toBe(1);
    expect((await payments.handleCallback({ ...message, txnid: b.txnId, udf1: b.intentId })).status).toBe('PENDING');
    expect((await payments.handleCallback({ ...message, amount: '1.00' })).status).toBe('PENDING'); // bad hash: not acted on
    expect(await IntentRecord.findOne({ txnId: a.txnId }).lean()).toMatchObject({ status: 'SUCCEEDED', amountPaise: 99750 });
    expect(await PaymentInboxRecord.find({ hashValid: false }).lean()).toEqual([expect.objectContaining({ txnId: b.txnId })]); // a's copy is a duplicate of a message already kept
    expect((await IntentRecord.findOne({ txnId: b.txnId }).lean())?.status).toBe('PENDING');
    expect(await TransactionRecord.countDocuments({ purpose: 'payment-received' })).toBe(1);
  });
});
