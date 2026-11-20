// @ts-check
/** Payment intents (S07-T06): PayU form, callback (hash, dedupe), processing only on PayU's verify answer, ledger entry once. */
import { URLSearchParams } from 'node:url';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createPayments,
  expectedResponseHash,
  IntentRecord,
  PaymentInboxRecord,
  processIntent,
  ReconExceptionRecord,
  requestHash,
} from '../../src/b2b/modules/payments/index.js';
import { AccountRecord, createLedger, seedPlatformAccounts, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-19T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const merchant = { key: 'gtKFFx', salt: 'eCwWELxi', env: /** @type {const} */ ('test') };
const logger = createLogger({ write: () => {} });
/** what the fake PayU verify API answers next, per txn id */
/** @type {Map<string, { status: 'SUCCESS' | 'PENDING' | 'FAILURE' | 'NOT_FOUND', amountPaise?: number }>} */
const payuSays = new Map();
let verifyCalls = 0;
const payu = /** @type {any} */ ({
  verify: async (/** @type {string} */ txnid) => {
    verifyCalls += 1;
    const a = payuSays.get(txnid) ?? { status: 'NOT_FOUND' };
    return {
      status: a.status,
      txnid,
      mihpayid: a.status === 'SUCCESS' ? '403993715531077182' : null,
      amountPaise: a.amountPaise ?? 0,
      mode: 'UPI',
    };
  },
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
  payuSays.clear();
  verifyCalls = 0;
  await Promise.all([
    IntentRecord.deleteMany({}),
    PaymentInboxRecord.deleteMany({}),
    ReconExceptionRecord.deleteMany({}),
    TransactionRecord.deleteMany({}),
    AccountRecord.deleteMany({}).setOptions(SYSTEM),
  ]);
  await seedPlatformAccounts();
  deps = { clock, logger, merchant, payu, ledger: createLedger({ clock }), callbackUrl: 'https://api.test/api/v1/payments/payu/callback' };
  payments = createPayments(deps);
});

const newIntent = () =>
  payments.createIntent({
    purpose: 'ORDER',
    reference: { type: 'order', id: 'MBO-1234-5678' },
    amountPaise: 99750,
    productinfo: 'Hotel booking MBO-1234-5678',
    payer: { firstname: 'Asha', email: 'asha@example.com', phone: '9876543210' },
    returnUrl: 'https://musafirbaba.com/hotels/checkout/result',
    createdBy: 'customer:1',
  });
/** PayU's browser post for a txn (signed like PayU would). @param {any} i @param {string} status @param {Record<string, string>} [over] */
const posted = (i, status, over = {}) => {
  const p = { ...i.fields, status, mihpayid: '403993715531077182', ...over };
  return { ...p, hash: expectedResponseHash(p, merchant) };
};
const entries = () => TransactionRecord.find({ 'reference.type': 'pay-intent' }).lean();

describe('the PayU form', () => {
  it('our amount, our txn id (B2BH…), our return address, signed like the existing integration', async () => {
    const i = await newIntent();
    expect(i.action).toBe('https://test.payu.in/_payment');
    expect(i.txnId).toMatch(/^B2BH[2-9A-Z]{12}$/);
    expect(i.fields).toMatchObject({
      key: 'gtKFFx',
      txnid: i.txnId,
      amount: '997.50',
      surl: deps.callbackUrl,
      furl: deps.callbackUrl,
      udf1: i.intentId,
    });
    const { hash, ...unsigned } = i.fields;
    expect(hash).toBe(requestHash(unsigned, merchant));
    expect(await IntentRecord.findOne({ txnId: i.txnId }).lean()).toMatchObject({ status: 'PENDING', amountPaise: 99750 });
  });

  it('without the PayU settings payments stay off', async () => {
    await expect(createPayments({ ...deps, merchant: null, payu: null }).createIntent(/** @type {any} */ ({}))).rejects.toThrow(
      /PAYMENTS_NOT_CONFIGURED/,
    );
  });
});

describe('callback and processing', () => {
  it('success confirmed by PayU → SUCCEEDED, event, one balanced ledger entry; repeats change nothing', async () => {
    const i = await newIntent();
    payuSays.set(i.txnId, { status: 'SUCCESS', amountPaise: 99750 });
    expect(await payments.handleCallback(posted(i, 'success'))).toEqual({
      redirect: 'https://musafirbaba.com/hotels/checkout/result',
      status: 'SUCCEEDED',
    });
    const stored = /** @type {any} */ (await IntentRecord.findOne({ txnId: i.txnId }).lean());
    expect(stored).toMatchObject({ status: 'SUCCEEDED', gatewayPaymentId: '403993715531077182', journalPosted: true });
    expect(stored.pendingEvents.map((/** @type {any} */ e) => e.type)).toEqual(['payments.intent.succeeded']);
    const [entry] = await entries();
    expect(entry?.lines.map((l) => [l.debitPaise, l.creditPaise])).toEqual([
      [99750, 0],
      [0, 99750],
    ]);
    await payments.handleCallback(posted(i, 'success'));
    expect(await entries()).toHaveLength(1);
    expect(await PaymentInboxRecord.countDocuments({ txnId: i.txnId })).toBe(1);
    expect(verifyCalls).toBe(1); // a final intent isn't verified again
  });

  it('a bad hash is kept but never acted on (the poller asks PayU later)', async () => {
    const i = await newIntent();
    payuSays.set(i.txnId, { status: 'SUCCESS', amountPaise: 99750 });
    const forged = { ...posted(i, 'success'), hash: 'f'.repeat(128) };
    expect((await payments.handleCallback(forged)).status).toBe('PENDING');
    expect(verifyCalls).toBe(0);
    expect(await PaymentInboxRecord.findOne({ txnId: i.txnId }).lean()).toMatchObject({ hashValid: false });
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.status).toBe('PENDING');
  });

  it('a "success" callback is not enough: PayU says failure → FAILED; PayU says another amount → FAILED + exception, no ledger entry', async () => {
    const a = await newIntent();
    payuSays.set(a.txnId, { status: 'FAILURE' });
    expect((await payments.handleCallback(posted(a, 'success'))).status).toBe('FAILED');
    const b = await newIntent();
    payuSays.set(b.txnId, { status: 'SUCCESS', amountPaise: 100 });
    expect((await payments.handleCallback(posted(b, 'success'))).status).toBe('FAILED');
    expect(await ReconExceptionRecord.findOne({ kind: 'AMOUNT_MISMATCH', key: b.txnId }).lean()).toMatchObject({
      status: 'OPEN',
      amountPaise: 100,
    });
    expect(await entries()).toEqual([]);
  });

  it('out of order: a failure arriving after the success never moves it back', async () => {
    const i = await newIntent();
    payuSays.set(i.txnId, { status: 'SUCCESS', amountPaise: 99750 });
    await payments.handleCallback(posted(i, 'success'));
    payuSays.set(i.txnId, { status: 'FAILURE' });
    await payments.handleCallback(posted(i, 'failure'));
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.status).toBe('SUCCEEDED');
  });

  it('PayU still pending → stays PENDING (counted); unpaid past its window → FAILED (abandoned); unknown txn → no redirect', async () => {
    const i = await newIntent();
    payuSays.set(i.txnId, { status: 'PENDING' });
    expect(await processIntent(deps, i.txnId, 'POLL')).toBe('PENDING');
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.verifyAttempts).toBe(1);
    payuSays.set(i.txnId, { status: 'NOT_FOUND' });
    nowMs += 31 * 60_000;
    expect(await processIntent(deps, i.txnId, 'POLL')).toBe('FAILED');
    expect((await IntentRecord.findOne({ txnId: i.txnId }).lean())?.failureReason).toBe('ABANDONED');
    expect(await payments.handleCallback({ txnid: 'txn123', status: 'success' })).toEqual({ redirect: null, status: 'UNKNOWN' });
  });
});

describe('the return address on the new API', () => {
  it('PayU posts a form to /api/v1/payments/payu/callback → the browser goes back to the page that started the payment', async () => {
    const express = (await import('express')).default;
    const { createB2BRouter } = await import('../../src/b2b/routes/v1.js');
    const { startServer } = await import('./helpers/http.js');
    const env = {
      B2B_AUTH_SECRET: ['callback', 'test', 'secret', 'long-enough-1234'].join('-'),
      PAYU_KEY: merchant.key,
      PAYU_SALT: merchant.salt,
      PAYU_ENV: 'test',
      B2B_API_PUBLIC_URL: 'https://api.test/api/v1',
    };
    const app = express();
    app.use('/api/v1', createB2BRouter({ connect: false, logger, clock, env }));
    const srv = await startServer(app);
    try {
      const i = await newIntent();
      const form = new URLSearchParams({ ...posted(i, 'success'), hash: 'f'.repeat(128) }); // forged: no PayU call, stays pending
      const res = await fetch(`${srv.base}/api/v1/payments/payu/callback`, { method: 'POST', body: form, redirect: 'manual' });
      expect(res.status).toBe(303);
      const to = new URL(String(res.headers.get('location')));
      expect(`${to.origin}${to.pathname}`).toBe('https://musafirbaba.com/hotels/checkout/result');
      expect(Object.fromEntries(to.searchParams)).toEqual({ payment: 'pending', txn: i.txnId });
    } finally {
      await srv.close();
    }
  });
});
