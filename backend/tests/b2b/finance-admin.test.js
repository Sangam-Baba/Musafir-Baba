// @ts-check
/** Finance admin (S07-T10): accounts, corrections (maker–checker), payments views, exceptions, import, manual refund, test payment. */
import express from 'express';
import { describe, expect, it } from 'vitest';

import { createLogger } from '../../src/b2b/core/logger.js';
import { IntentRecord, ReconExceptionRecord, SettlementRecord } from '../../src/b2b/modules/payments/index.js';
import {
  AccountRecord,
  AdjustmentRecord,
  createLedger,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { asStaff, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const app = useInventoryApp({ clock, models: [AdjustmentRecord, ReconExceptionRecord, SettlementRecord, IntentRecord] });
const FIN = 'wallet.ledger.read,wallet.adjustment.propose,payments.payment.read,payments.recon.manage';
const F1 = asStaff(`f1:${FIN}`);
const F2 = asStaff(`f2:${FIN},wallet.adjustment.approve`);
const SA = asStaff('sa:wallet.adjustment.approve,wallet.ledger.read');
const HOTELS = asStaff('h1:hotel-catalog.listing.read');

async function accounts() {
  await TransactionRecord.deleteMany({});
  await AccountRecord.deleteMany({}).setOptions(SYSTEM);
  await seedPlatformAccounts();
  const l = createLedger({ clock });
  return { bank: await l.accountId('platform', 'BANK'), suspense: await l.accountId('platform', 'SUSPENSE') };
}

describe('ledger views and corrections', () => {
  it("finance sees the accounts; other staff don't", async () => {
    await accounts();
    const r = await app.admin.get('/api/v1/admin/accounts', F1);
    expect(r.status).toBe(200);
    expect(r.body.data.map((/** @type {any} */ a) => a.type)).toContain('GATEWAY_CLEARING');
    expect((await app.admin.get('/api/v1/admin/accounts', HOTELS)).status).toBe(403);
  });

  it('a correction needs a reason and a second person; approved → one journal entry; rejected → none', async () => {
    const { bank, suspense } = await accounts();
    const body = {
      reasonCode: 'BANK_CHARGES',
      note: 'Bank charged a fee not in PayU file',
      lines: [
        { accountId: suspense, debitPaise: 1500 },
        { accountId: bank, creditPaise: 1500 },
      ],
    };
    const p = await app.admin.post('/api/v1/admin/adjustments', body, F2);
    expect(p.status).toBe(201);
    expect((await app.admin.post(`/api/v1/admin/adjustments/${p.body.id}/approve`, {}, F2)).body.code).toBe('SECOND_PERSON_REQUIRED');
    expect((await app.admin.post(`/api/v1/admin/adjustments/${p.body.id}/approve`, {}, F1)).status).toBe(403); // no approve permission
    const ok = await app.admin.post(`/api/v1/admin/adjustments/${p.body.id}/approve`, { note: 'Checked bank statement' }, SA);
    expect(ok.body).toMatchObject({ status: 'POSTED', decidedBy: 'staff:sa', transactionId: expect.any(String) });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'adjustment' })).toBe(1);
    expect((await app.admin.post(`/api/v1/admin/adjustments/${p.body.id}/approve`, {}, SA)).body.code).toBe('ADJUSTMENT_STATUS');
    const unbalanced = await app.admin.post(
      '/api/v1/admin/adjustments',
      {
        ...body,
        lines: [
          { accountId: suspense, debitPaise: 1500 },
          { accountId: bank, creditPaise: 1000 },
        ],
      },
      F1,
    );
    expect(unbalanced.body.code).toBe('JOURNAL_ENTRY_INVALID');
    const q = await app.admin.post('/api/v1/admin/adjustments', body, F1);
    expect((await app.admin.post(`/api/v1/admin/adjustments/${q.body.id}/reject`, { note: 'Already in PayU file' }, SA)).body.status).toBe(
      'REJECTED',
    );
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'adjustment' })).toBe(1);
  });
});

describe('payments views', () => {
  it('exceptions listed and resolved with a note; a settlement file imported; manual refund needs its own permission', async () => {
    await accounts();
    await ReconExceptionRecord.create({ kind: 'SETTLEMENT_UNMATCHED', key: 'k1', detail: 'x', raisedAt: clock.now() });
    const open = await app.admin.get('/api/v1/admin/recon-exceptions', F1);
    expect(open.body.data).toHaveLength(1);
    const done = await app.admin.post(
      `/api/v1/admin/recon-exceptions/${open.body.data[0]._id}/resolve`,
      { note: 'PayU confirmed a duplicate line' },
      F1,
    );
    expect(done.body).toMatchObject({ status: 'RESOLVED', resolvedBy: 'staff:f1' });
    const imported = await app.admin.post(
      '/api/v1/admin/settlements/import',
      { lines: [{ txnid: 'txn1', mihpayid: 'M1', amountPaise: 1000, settledOn: '2026-11-20' }] },
      F1,
    );
    expect(imported.body).toEqual({ lines: 1, ours: 0, matched: 0, exceptions: 0 }); // not ours → ignored
    const refund = await app.admin.post(
      '/api/v1/admin/refunds',
      { intentId: '64b0000000000000000000aa', amountPaise: 100, reason: 'Customer asked', requestId: 'req-00000001' },
      F1,
    );
    expect(refund.status).toBe(403);
  });

  it('the test payment: switched off without the PayU settings; with them → the PayU form for ₹1 (test txn id)', async () => {
    const off = await app.admin.post(
      '/api/v1/admin/payments/test',
      { email: 'admin@musafirbaba.com', name: 'Admin' },
      asStaff('sa:payments.test.run'),
    );
    expect(off.body.code).toBe('PAYMENTS_NOT_CONFIGURED');
    const staffApp = express();
    staffApp.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger: createLogger({ write: () => {} }),
        clock,
        env: {
          B2B_AUTH_SECRET: ['fin', 'test', 'secret', 'long-enough-12345'].join('-'),
          PAYU_KEY: 'gtKFFx',
          PAYU_SALT: 'eCwWELxi',
          PAYU_ENV: 'test',
          B2B_API_PUBLIC_URL: 'https://api.test/api/v1',
          B2B_PUBLIC_URL: 'https://musafirbaba.com',
        },
        authenticate: async (req) => {
          const [staffId, perms] = String(req.get('x-staff') ?? '').split(':');
          return staffId ? { type: 'staff', staffId, permissions: (perms ?? '').split(',') } : null;
        },
      }),
    );
    const srv = await startServer(staffApp);
    try {
      const r = await srv.post(
        '/api/v1/admin/payments/test',
        { email: 'admin@musafirbaba.com', name: 'Admin' },
        asStaff('sa:payments.test.run'),
      );
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        action: 'https://test.payu.in/_payment',
        txnId: expect.stringMatching(/^B2BT/),
        fields: { amount: '1.00', surl: 'https://api.test/api/v1/payments/payu/callback', hash: expect.any(String) },
      });
      expect((await IntentRecord.findOne({ txnId: r.body.txnId }).lean())?.returnUrl).toBe('https://musafirbaba.com/admin/b2b');
      expect(
        (await srv.post('/api/v1/admin/payments/test', { email: 'a@b.in', name: 'A' }, asStaff('f1:payments.payment.read'))).status,
      ).toBe(403);
    } finally {
      await srv.close();
    }
  });
});
