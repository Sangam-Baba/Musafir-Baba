// @ts-check
/**
 * Client plan and billing API (S13-T08): the subscription starts on first look (trial), plans on offer, change
 * preview, change (a stale version → 409), cancel at period end and undo, invoices list and printable page, another
 * company can't see them, PayU only for unpaid invoices.
 */
import { describe, expect, it } from 'vitest';

import { InvoiceRecord } from '../../src/b2b/modules/billing/index.js';
import { createSubscriptions, seedPlans, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import { createLedger, createLiveWallets, seedPlatformAccounts } from '../../src/b2b/modules/wallet/index.js';
import { billingFor, runBilling } from '../../src/b2b/routes/subscriptions-wiring.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-10T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({ clock, models: [SubscriptionRecord, InvoiceRecord] });

describe('client plan API', () => {
  it('trial on first look; plans; preview; change (stale version 409); cancel and undo; invoices', async () => {
    await seedPlans();
    await seedPlatformAccounts();
    const c = await clientOwner(app, 'plan-api@trips.in');
    const sub = (await app.srv.get('/api/v1/subscription', auth(c.token))).body;
    expect(sub).toMatchObject({ planKey: 'STARTER', status: 'TRIAL', allowance: 1000, used: 0, percent: 0 });
    expect((await app.srv.get('/api/v1/plans', auth(c.token))).body.data.map((/** @type {any} */ p) => p.key)).toEqual([
      'STARTER',
      'A',
      'B',
      'C',
    ]);
    const preview = (await app.srv.post('/api/v1/subscription/change-preview', { planKey: 'B' }, auth(c.token))).body;
    expect(preview).toMatchObject({ kind: 'UPGRADE', chargeNowPaise: Math.round((349_900 * 21) / 30) });
    expect(
      (await app.srv.post('/api/v1/subscription/change', { planKey: 'B', expectedVersion: sub.version + 5 }, auth(c.token))).status,
    ).toBe(409);
    const changed = (await app.srv.post('/api/v1/subscription/change', { planKey: 'B', expectedVersion: sub.version }, auth(c.token))).body;
    expect(changed).toMatchObject({ kind: 'UPGRADE', subscription: { planKey: 'B', status: 'ACTIVE' } });
    expect((await app.srv.post('/api/v1/subscription/cancel', {}, auth(c.token))).body.pending).toMatchObject({ action: 'CANCEL' });
    expect((await app.srv.post('/api/v1/subscription/cancel', { undo: true }, auth(c.token))).body.pending).toBeNull();

    const ledger = createLedger({ clock });
    await createLiveWallets({ clock, ledger }).open(c.orgId);
    const subs = createSubscriptions({ clock });
    await runBilling(subs, billingFor(clock, {}, subs));
    const invoices = (await app.srv.get('/api/v1/billing/invoices', auth(c.token))).body.data;
    expect(invoices).toEqual([expect.objectContaining({ number: 'S2627DL000001', status: 'UNPAID' })]);
    const page = await app.srv.get(`/api/v1/billing/invoices/${invoices[0].id}`, auth(c.token));
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(page.headers.get('content-security-policy')).toContain("default-src 'none'");
    const other = await clientOwner(app, 'plan-api-other@trips.in');
    expect((await app.srv.get(`/api/v1/billing/invoices/${invoices[0].id}`, auth(other.token))).status).toBe(404);
    expect((await app.srv.post(`/api/v1/billing/invoices/${invoices[0].id}/pay`, {}, auth(c.token))).status).toBe(400); // key needed
    expect(await SubscriptionRecord.countDocuments({}).setOptions(S)).toBe(1); // the other company never opened its plan
  });
});
