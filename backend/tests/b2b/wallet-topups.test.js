// @ts-check
/**
 * Wallet top-ups via PayU (S11-T05): the client's Owner starts one (amount limits, Idempotency-Key — same key → same
 * payment); PayU confirmed → the wallet credited once (delivered twice → once); paid after the window → still credited,
 * never refunded; only the client's own wallet; switched off → 503.
 */
import express from 'express';
import { describe, expect, it } from 'vitest';

import { createLogger } from '../../src/b2b/core/logger.js';
import { IntentRecord, processIntent, RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { AccountRecord, createLedger, seedPlatformAccounts, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { stage11Routes } from '../../src/b2b/routes/wallet.js';
import { walletParts } from '../../src/b2b/routes/wallet-wiring.js';
import { startServer } from './helpers/http.js';
import { auth, PASSWORD, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

let nowMs = Date.parse('2026-11-21T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const merchant = { PAYU_KEY: 'gtKFFx', PAYU_SALT: 'eCwWELxi', PAYU_ENV: 'test' };
const app = useInventoryApp({
  clock,
  models: [IntentRecord, RefundRecord, TransactionRecord],
  env: { ...merchant, B2B_WALLET_ENABLED: 'true', B2B_API_PUBLIC_URL: 'https://api.test/api/v1' },
});
/** @type {Map<string, { status: string, amountPaise: number }>} */
const payuSays = new Map();
const payu = /** @type {any} */ ({
  verify: async (/** @type {string} */ txnid) => {
    const a = payuSays.get(txnid) ?? { status: 'NOT_FOUND', amountPaise: 0 };
    return { status: a.status, txnid, mihpayid: a.status === 'SUCCESS' ? `MIH${txnid}` : null, amountPaise: a.amountPaise, mode: 'UPI' };
  },
  refund: async () => ({ accepted: true, requestId: 'R', message: 'queued' }),
  refundStatus: async () => ({ status: 'PENDING', raw: '' }),
});
const payDeps = () => ({
  clock,
  logger: createLogger({ write: () => {} }),
  merchant: { key: merchant.PAYU_KEY, salt: merchant.PAYU_SALT, env: /** @type {const} */ ('test') },
  payu,
  ledger: createLedger({ clock }),
  callbackUrl: 'https://api.test/api/v1/payments/payu/callback',
});
let n = 0;
const key = () => `topup-test-key-${String((n += 1)).padStart(6, '0')}`;

/** Deliver an intent's stored events to the wallet's top-up consumer (what the relay does). @param {string} txnId */
async function deliver(txnId) {
  const consumer = walletParts(clock).topUps;
  const i = /** @type {any} */ (await IntentRecord.findOne({ txnId }).lean());
  for (const e of i.pendingEvents ?? []) if (consumer.types.includes(e.type)) await consumer.handler({ payload: e.payload });
}

async function client() {
  nowMs = Date.parse('2026-11-21T10:00:00Z');
  payuSays.clear();
  await seedPlatformAccounts();
  const email = `owner${(n += 1)}@trips.example`;
  return { ...(await clientOwner(app, email)), email };
}

describe('starting a top-up', () => {
  it('Owner: wallet at zero; a top-up gives the PayU form; the same key → the same payment; limits and the key are checked', async () => {
    const c = await client();
    expect((await app.srv.get('/api/v1/wallet', auth(c.token))).body).toMatchObject({ balancePaise: 0, availablePaise: 0 });
    const k = key();
    const first = await app.srv.post('/api/v1/wallet/top-ups', { amountPaise: 500_000 }, { ...auth(c.token), 'idempotency-key': k });
    expect(first.status).toBe(201);
    expect(first.body.txnId).toMatch(/^B2BW/);
    expect(first.body.fields).toMatchObject({ amount: '5000.00', surl: 'https://api.test/api/v1/payments/payu/callback' });
    const again = await app.srv.post('/api/v1/wallet/top-ups', { amountPaise: 500_000 }, { ...auth(c.token), 'idempotency-key': k });
    expect(again.body.txnId).toBe(first.body.txnId);
    expect((await app.srv.post('/api/v1/wallet/top-ups', { amountPaise: 500_000 }, auth(c.token))).status).toBe(400);
    expect(
      (await app.srv.post('/api/v1/wallet/top-ups', { amountPaise: 9_999 }, { ...auth(c.token), 'idempotency-key': key() })).status,
    ).toBe(400);
    const list = (await app.srv.get('/api/v1/wallet/top-ups', auth(c.token))).body.data;
    expect(list).toEqual([expect.objectContaining({ txnId: first.body.txnId, amountPaise: 500_000, status: 'PENDING' })]);
  });

  it('a hotel company has no wallet here (403); signed out → 401', async () => {
    const email = `hotel${(n += 1)}@stay.example`;
    const owner = await app.users.create({ email, name: 'Owner', password: PASSWORD });
    await app.orgs.createOrganization({ type: 'HOTEL', legalName: 'Stay Co', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' });
    const h = { token: await app.login(email) };
    expect((await app.srv.get('/api/v1/wallet', auth(h.token))).status).toBe(403);
    expect((await app.srv.get('/api/v1/wallet')).status).toBe(401);
  });

  it('switched off → 503 WALLET_NOT_ENABLED', async () => {
    const off = express();
    off.use('/api/v1', stage11Routes({}, clock, createLogger({ write: () => {} })));
    off.use((/** @type {any} */ e, /** @type {any} */ _q, /** @type {any} */ r, /** @type {any} */ _n) =>
      r.status(e.status ?? 500).json({ code: e.code }),
    );
    const srv = await startServer(off);
    expect(await srv.get('/api/v1/wallet')).toMatchObject({ status: 503, body: { code: 'WALLET_NOT_ENABLED' } });
    await srv.close();
  });
});

describe('PayU confirms', () => {
  it('paid → the wallet credited once (events delivered twice); the books: clearing → advances → wallet', async () => {
    const c = await client();
    const form = (await app.srv.post('/api/v1/wallet/top-ups', { amountPaise: 250_000 }, { ...auth(c.token), 'idempotency-key': key() }))
      .body;
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: 250_000 });
    expect(await processIntent(payDeps(), form.txnId, 'POLL')).toBe('SUCCEEDED');
    await deliver(form.txnId);
    await deliver(form.txnId);
    expect((await app.srv.get('/api/v1/wallet', auth(c.token))).body).toMatchObject({ balancePaise: 250_000, availablePaise: 250_000 });
    expect(await TransactionRecord.countDocuments({ 'reference.id': form.txnId })).toBe(2); // payment-received + wallet-topup
    const w = /** @type {any} */ (
      await AccountRecord.findOne({ ownerOrgId: c.orgId, type: 'WALLET' }).setOptions({ tenantScope: 'SYSTEM', tenantReason: 't' }).lean()
    );
    expect(w.ops).toEqual([]);
  });

  it('paid after the window → credited to the wallet, not refunded', async () => {
    const c = await client();
    const form = (await app.srv.post('/api/v1/wallet/top-ups', { amountPaise: 100_000 }, { ...auth(c.token), 'idempotency-key': key() }))
      .body;
    nowMs += 31 * 60_000;
    expect(await processIntent(payDeps(), form.txnId, 'POLL')).toBe('FAILED'); // abandoned
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: 100_000 });
    nowMs += 61 * 60_000;
    await processIntent(payDeps(), form.txnId, 'POLL');
    await deliver(form.txnId);
    c.token = await app.login(c.email); // signed in again after the clock jump
    expect((await app.srv.get('/api/v1/wallet', auth(c.token))).body.balancePaise).toBe(100_000);
    expect(await RefundRecord.countDocuments({ txnId: form.txnId })).toBe(0);
    const list = (await app.srv.get('/api/v1/wallet/top-ups', auth(c.token))).body.data;
    expect(list[0]).toMatchObject({ txnId: form.txnId, paidLate: true });
  });
});
