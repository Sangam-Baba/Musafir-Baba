// @ts-check
/**
 * Credit lines (S11-T07, D9): proposed by one finance person, approved by a different one, then on the wallet; one open
 * proposal per client; credit used = the wallet below zero (never past the limit); overdue after the due days → new
 * spending and holds blocked, top-ups still accepted and clearing the dues unblocks; `GET /credit`; a newer line
 * supersedes the old one; an approval cut short is applied by the job.
 */
import { describe, expect, it } from 'vitest';

import {
  CreditLineRecord,
  createHolds,
  createLedger,
  createLiveWallets,
  seedPlatformAccounts,
  TransactionRecord,
  WalletHoldRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { walletParts } from '../../src/b2b/routes/wallet-wiring.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

let nowMs = Date.parse('2026-11-21T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({
  clock,
  models: [CreditLineRecord, TransactionRecord, WalletHoldRecord],
  env: { B2B_WALLET_ENABLED: 'true' },
});
const maker = asStaff('f1:wallet.credit.propose');
const checker = asStaff('f2:wallet.credit.propose,wallet.credit.approve');
let n = 0;

async function client() {
  nowMs = Date.parse('2026-11-21T10:00:00Z');
  await seedPlatformAccounts();
  const email = `credit${(n += 1)}@trips.example`;
  return { ...(await clientOwner(app, email)), email };
}
/** @param {string} orgId @param {number} limitPaise @param {number} dueDays */
async function grant(orgId, limitPaise, dueDays) {
  const p = await app.admin.post('/api/v1/admin/wallet/credit-lines', { clientOrgId: orgId, limitPaise, dueDays }, maker);
  return app.admin.post(`/api/v1/admin/wallet/credit-lines/${p.body.id}/decide`, { approve: true }, checker);
}
/** + top-up / − spend straight on the engine. @param {string} orgId @param {number} amount */
async function move(orgId, amount) {
  const ledger = createLedger({ clock });
  const bank = await ledger.accountId('platform', 'BANK');
  const id = `c-${(n += 1)}`;
  return createLiveWallets({ clock, ledger }).apply({
    clientOrgId: orgId,
    opId: id,
    type: amount > 0 ? 'TOPUP' : 'DEBIT',
    amountPaise: amount,
    journal: {
      reference: { type: 'test-credit', id },
      purpose: amount > 0 ? 'wallet-topup' : 'wallet-debit',
      lines: [amount > 0 ? { accountId: bank, debitPaise: amount } : { accountId: bank, creditPaise: -amount }],
    },
    by: 'test',
  });
}

describe('credit lines', () => {
  it('proposed, approved by someone else → on the wallet; the proposer cannot approve; one open proposal per client', async () => {
    const c = await client();
    expect((await app.srv.get('/api/v1/credit', auth(c.token))).body).toMatchObject({ limitPaise: 0, usedPaise: 0, overdue: false });
    const p = (
      await app.admin.post('/api/v1/admin/wallet/credit-lines', { clientOrgId: c.orgId, limitPaise: 5_000_000, dueDays: 15 }, maker)
    ).body;
    expect(p.status).toBe('PROPOSED');
    expect(
      (await app.admin.post('/api/v1/admin/wallet/credit-lines', { clientOrgId: c.orgId, limitPaise: 1, dueDays: 15 }, maker)).status,
    ).toBe(409);
    const same = asStaff('f1:wallet.credit.propose,wallet.credit.approve');
    expect((await app.admin.post(`/api/v1/admin/wallet/credit-lines/${p.id}/decide`, { approve: true }, same)).status).toBe(403);
    expect((await app.admin.post(`/api/v1/admin/wallet/credit-lines/${p.id}/decide`, { approve: true }, maker)).status).toBe(403);
    expect((await app.admin.post(`/api/v1/admin/wallet/credit-lines/${p.id}/decide`, { approve: true }, checker)).body.status).toBe(
      'APPROVED',
    );
    expect((await app.srv.get('/api/v1/credit', auth(c.token))).body).toMatchObject({
      limitPaise: 5_000_000,
      dueDays: 15,
      availablePaise: 5_000_000,
    });

    await grant(c.orgId, 2_000_000, 30); // a newer line replaces it
    expect(await CreditLineRecord.countDocuments({ clientOrgId: c.orgId, status: 'SUPERSEDED' }).setOptions(S)).toBe(1);
    expect((await app.srv.get('/api/v1/wallet', auth(c.token))).body).toMatchObject({ creditLimitPaise: 2_000_000, creditDueDays: 30 });
  });

  it('spending below zero up to the limit; overdue after the due days → spending and holds blocked; a top-up clears it', async () => {
    const c = await client();
    await grant(c.orgId, 1_000_000, 10);
    await move(c.orgId, -600_000);
    await expect(move(c.orgId, -400_001)).rejects.toMatchObject({ code: 'INSUFFICIENT_WALLET_BALANCE' });
    let credit = (await app.srv.get('/api/v1/credit', auth(c.token))).body;
    expect(credit).toMatchObject({ usedPaise: 600_000, availablePaise: 400_000, overdue: false, dueAt: '2026-12-01T10:00:00.000Z' });

    nowMs = Date.parse('2026-12-01T10:00:01Z');
    const holds = createHolds({ clock, ledger: createLedger({ clock }) });
    await expect(move(c.orgId, -1_000)).rejects.toMatchObject({ code: 'CREDIT_OVERDUE' });
    await expect(holds.hold({ clientOrgId: c.orgId, key: `o-${n}`, amountPaise: 1_000, ttlMs: 60_000, by: 't' })).rejects.toMatchObject({
      code: 'CREDIT_OVERDUE',
    });
    expect((await app.admin.get('/api/v1/admin/wallet/credit-overdue', maker)).body.data).toEqual([
      expect.objectContaining({ clientOrgId: c.orgId, usedPaise: 600_000 }),
    ]);

    await move(c.orgId, 300_000); // part paid — still overdue
    await expect(move(c.orgId, -1_000)).rejects.toMatchObject({ code: 'CREDIT_OVERDUE' });
    await move(c.orgId, 300_000); // dues cleared
    await move(c.orgId, -1_000);
    c.token = await app.login(c.email);
    credit = (await app.srv.get('/api/v1/credit', auth(c.token))).body;
    expect(credit).toMatchObject({ usedPaise: 1_000, overdue: false, dueAt: '2026-12-11T10:00:01.000Z' });
  });

  it('approved but not yet on the wallet → the job applies it', async () => {
    const c = await client();
    await CreditLineRecord.create({
      clientOrgId: c.orgId,
      limitPaise: 700_000,
      dueDays: 7,
      status: 'APPROVED',
      proposedBy: 'staff:f1',
      decidedBy: 'staff:f2',
    });
    await createLiveWallets({ clock, ledger: createLedger({ clock }) }).open(c.orgId);
    await walletParts(clock).schedule.run();
    expect((await app.srv.get('/api/v1/credit', auth(c.token))).body).toMatchObject({ limitPaise: 700_000, dueDays: 7 });
  });
});
