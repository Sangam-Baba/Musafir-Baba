// @ts-check
/**
 * Wallet adjustments and refunds to wallet (S11-T08): a credit or debit proposed by one finance person and approved by
 * another moves the live balance once with its journal entry; a debit not covered is refused and stays open; Stage 07
 * correcting entries can no longer touch a client wallet; a refund into the wallet is instant and repeat-safe.
 */
import { describe, expect, it } from 'vitest';

import {
  AccountRecord,
  AdjustmentRecord,
  createLedger,
  createLiveWallets,
  refundToWallet,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-21T10:00:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({ clock, models: [AdjustmentRecord, TransactionRecord], env: { B2B_WALLET_ENABLED: 'true' } });
const maker = asStaff('f1:wallet.adjustment.propose,wallet.ledger.read');
const checker = asStaff('f2:wallet.adjustment.propose,wallet.adjustment.approve');
let n = 0;

async function client() {
  await seedPlatformAccounts();
  const c = await clientOwner(app, `adj${(n += 1)}@trips.example`);
  await app.srv.get('/api/v1/wallet', auth(c.token)); // opens the wallet
  return c;
}
/** @param {string} orgId */
const wallet = async (orgId) =>
  /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: orgId, type: 'WALLET' }).setOptions(S).lean());
/** @param {string} orgId @param {number} amountPaise */
const propose = (orgId, amountPaise) =>
  app.admin.post(
    '/api/v1/admin/wallet/adjustments',
    {
      clientOrgId: orgId,
      amountPaise,
      counterType: 'SUSPENSE',
      reasonCode: amountPaise > 0 ? 'GOODWILL_CREDIT' : 'TOPUP_CORRECTION',
      note: 'Agreed with the client',
    },
    maker,
  );

describe('wallet adjustments', () => {
  it('credit: proposed, approved by someone else → balance up once with its entry; the proposer cannot approve', async () => {
    const c = await client();
    const p = (await propose(c.orgId, 150_000)).body;
    expect(p).toMatchObject({ status: 'PROPOSED', amountPaise: 150_000 });
    expect((await app.admin.post(`/api/v1/admin/wallet/adjustments/${p.id}/decide`, { approve: true }, maker)).status).toBe(403);
    const done = await app.admin.post(`/api/v1/admin/wallet/adjustments/${p.id}/decide`, { approve: true }, checker);
    expect(done.body).toMatchObject({ status: 'POSTED', decidedBy: 'staff:f2' });
    expect((await app.admin.post(`/api/v1/admin/wallet/adjustments/${p.id}/decide`, { approve: true }, checker)).status).toBe(409);
    expect((await wallet(c.orgId)).balancePaise).toBe(150_000);
    const entry = /** @type {any} */ (await TransactionRecord.findOne({ 'reference.type': 'adjustment', 'reference.id': p.id }).lean());
    expect(entry).toMatchObject({ purpose: 'wallet-adjustment' });
    expect(entry.memo).toContain('GOODWILL_CREDIT');
  });

  it('a debit larger than the wallet → refused, stays open; once covered it posts', async () => {
    const c = await client();
    const p = (await propose(c.orgId, -50_000)).body;
    const r = await app.admin.post(`/api/v1/admin/wallet/adjustments/${p.id}/decide`, { approve: true }, checker);
    expect(r).toMatchObject({ status: 409, body: { code: 'INSUFFICIENT_WALLET_BALANCE' } });
    expect((await app.admin.get(`/api/v1/admin/wallet/adjustments?clientOrgId=${c.orgId}`, maker)).body.data[0].status).toBe('PROPOSED');
    const credit = (await propose(c.orgId, 80_000)).body;
    await app.admin.post(`/api/v1/admin/wallet/adjustments/${credit.id}/decide`, { approve: true }, checker);
    expect((await app.admin.post(`/api/v1/admin/wallet/adjustments/${p.id}/decide`, { approve: true }, checker)).body.status).toBe(
      'POSTED',
    );
    expect((await wallet(c.orgId)).balancePaise).toBe(30_000);
  });

  it('Stage 07 correcting entries can no longer touch a client wallet', async () => {
    const c = await client();
    const w = await wallet(c.orgId);
    const ledger = createLedger({ clock });
    const r = await app.admin.post(
      '/api/v1/admin/adjustments',
      {
        reasonCode: 'OTHER',
        note: 'Trying to edit a wallet directly',
        lines: [
          { accountId: String(w._id), creditPaise: 1_000 },
          { accountId: await ledger.accountId('platform', 'SUSPENSE'), debitPaise: 1_000 },
        ],
      },
      asStaff('f1:wallet.adjustment.propose'),
    );
    expect(r).toMatchObject({ status: 422, body: { code: 'LIVE_ACCOUNT_NEEDS_WALLET_ADJUSTMENT' } });
  });
});

describe('refunds to wallet', () => {
  it('instant, once per reference (repeated → nothing more)', async () => {
    const c = await client();
    const ledger = createLedger({ clock });
    const deps = { clock, ledger, wallets: createLiveWallets({ clock, ledger }) };
    const advances = await ledger.accountId('platform', 'CUSTOMER_ADVANCES');
    const a = {
      clientOrgId: c.orgId,
      reference: { type: 'cancellation', id: 'booking-1' },
      amountPaise: 42_000,
      lines: [{ accountId: advances, debitPaise: 42_000 }],
      by: 'system:test',
    };
    expect(await refundToWallet(deps, a)).toEqual({ applied: true });
    expect(await refundToWallet(deps, a)).toEqual({ applied: false });
    expect((await wallet(c.orgId)).balancePaise).toBe(42_000);
    expect(await TransactionRecord.countDocuments({ purpose: 'wallet-refund' })).toBe(1);
  });
});
