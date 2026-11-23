// @ts-check
/**
 * Admin views of client wallets (S11-T10): every wallet with its company name, balance and credit (overdue first);
 * a client's statement; the daily manual-credits report (bank transfers approved + wallet adjustments posted that
 * Indian day, with who checked and who approved); only with `wallet.ledger.read`.
 */
import { describe, expect, it } from 'vitest';

import { AdjustmentRecord, ManualTopUpRecord, seedPlatformAccounts, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-21T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [ManualTopUpRecord, AdjustmentRecord, TransactionRecord],
  env: { B2B_WALLET_ENABLED: 'true' },
});
const reader = asStaff('r1:wallet.ledger.read');
const f1 = asStaff('f1:wallet.topup.check,wallet.adjustment.propose');
const f2 = asStaff('f2:wallet.topup.check,wallet.topup.approve,wallet.adjustment.propose,wallet.adjustment.approve');

describe('admin wallet views', () => {
  it('wallets list, a statement and the day’s manual credits; others get 403', async () => {
    await seedPlatformAccounts();
    const c = await clientOwner(app, 'admin-view@trips.example');
    const t = (
      await app.srv.post(
        '/api/v1/wallet/manual-top-ups',
        { amountPaise: 300_000, method: 'IMPS', utr: 'ICIC99887766', paidOn: '2026-11-21' },
        auth(c.token),
      )
    ).body;
    await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/check`, { ok: true }, f1);
    await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, f2);
    const a = (
      await app.admin.post(
        '/api/v1/admin/wallet/adjustments',
        { clientOrgId: c.orgId, amountPaise: 20_000, counterType: 'SUSPENSE', reasonCode: 'GOODWILL_CREDIT', note: 'Sorry for the delay' },
        f1,
      )
    ).body;
    await app.admin.post(`/api/v1/admin/wallet/adjustments/${a.id}/decide`, { approve: true }, f2);

    const list = (await app.admin.get('/api/v1/admin/wallet/clients', reader)).body.data;
    expect(list).toEqual([expect.objectContaining({ clientOrgId: c.orgId, name: 'Trips Co', balancePaise: 320_000, overdue: false })]);
    const s = (await app.admin.get(`/api/v1/admin/wallet/clients/${c.orgId}/statement?from=2026-11-21&to=2026-11-21`, reader)).body;
    expect(s).toMatchObject({ openingPaise: 0, closingPaise: 320_000 });
    const report = (await app.admin.get('/api/v1/admin/wallet/manual-credits?date=2026-11-21', reader)).body;
    expect(report).toMatchObject({ totalPaise: 320_000 });
    expect(report.rows.map((/** @type {any} */ r) => [r.kind, r.checkedBy, r.approvedBy])).toEqual([
      ['BANK_TRANSFER', 'staff:f1', 'staff:f2'],
      ['ADJUSTMENT', 'staff:f1', 'staff:f2'],
    ]);
    expect((await app.admin.get('/api/v1/admin/wallet/manual-credits?date=2026-11-20', reader)).body.rows).toEqual([]);
    expect((await app.admin.get('/api/v1/admin/wallet/clients', f1)).status).toBe(403);
  });
});
