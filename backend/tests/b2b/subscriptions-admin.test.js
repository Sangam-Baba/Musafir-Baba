// @ts-check
/**
 * Admin plans and billing API (S13-T09): plan versions drafted by one person and published by another (exact
 * permission); query weights; every client's subscription with use %; overrides / top-ups by two people; dunning
 * board; revenue summary; permissions enforced.
 */
import { describe, expect, it } from 'vitest';

import { InvoiceRecord } from '../../src/b2b/modules/billing/index.js';
import { OverrideRecord, PlanVersionRecord, seedPlans, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-10T06:30:00Z') };
const app = useInventoryApp({ clock, models: [SubscriptionRecord, InvoiceRecord, OverrideRecord] });
const f1 = asStaff('f1:subscriptions.plan.manage,subscriptions.subscription.manage');
const f2 = asStaff(
  'f2:subscriptions.plan.manage,subscriptions.plan.publish,subscriptions.subscription.manage,subscriptions.override.approve',
);

describe('admin plans and billing', () => {
  it('plan version → published by someone else; weights; subscriptions table; overrides; dunning; revenue', async () => {
    await PlanVersionRecord.deleteMany({});
    await seedPlans();
    const plan = {
      name: 'Plan D',
      monthlyQueryLimit: 20_000,
      pricePaise: 999_900,
      limitBehaviour: 'OVERAGE',
      overagePricePerQueryPaise: 50,
      trialDays: 0,
      features: { users: 50, branches: 50, api: true, webhooks: true },
    };
    const draft = (await app.admin.post('/api/v1/admin/plans/D/versions', plan, f1)).body;
    expect(draft).toMatchObject({ key: 'D', version: 1, status: 'DRAFT' });
    expect((await app.admin.post(`/api/v1/admin/plans/versions/${draft.id}/decide`, { approve: true }, f1)).status).toBe(403); // no publish permission
    expect((await app.admin.post(`/api/v1/admin/plans/versions/${draft.id}/decide`, { approve: true }, f2)).body.status).toBe('PUBLISHED');
    expect(
      (await app.admin.get('/api/v1/admin/plans', f1)).body.data.filter((/** @type {any} */ p) => p.status === 'PUBLISHED'),
    ).toHaveLength(5);
    expect(
      (
        await app.admin.put(
          '/api/v1/admin/query-weights',
          {
            weights: [
              { kind: 'hotel.search', weight: 1 },
              { kind: 'hotel.offers', weight: 1 },
              { kind: 'hotel.pricecheck', weight: 0 },
              { kind: 'hotel.order', weight: 0 },
            ],
          },
          f1,
        )
      ).body,
    ).toMatchObject({ 'hotel.pricecheck': 0 });

    const c = await clientOwner(app, 'admin-plans@trips.in');
    await app.srv.get('/api/v1/subscription', auth(c.token)); // starts the trial
    const table = (await app.admin.get('/api/v1/admin/subscriptions', f1)).body.data;
    expect(table).toEqual([
      expect.objectContaining({ clientOrgId: c.orgId, name: 'Trips Co', planKey: 'STARTER', status: 'TRIAL', percent: 0 }),
    ]);
    const top = (
      await app.admin.post('/api/v1/admin/overrides', { clientOrgId: c.orgId, kind: 'TOPUP', queries: 2000, reason: 'Pilot client' }, f1)
    ).body;
    expect((await app.admin.post(`/api/v1/admin/overrides/${top.id}/decide`, { approve: true }, f2)).body).toMatchObject({
      status: 'APPROVED',
      applied: true,
    });
    expect((await app.srv.get('/api/v1/subscription', auth(c.token))).body.allowance).toBe(3000);
    expect((await app.admin.get('/api/v1/admin/dunning', f1)).body.data).toEqual([]);
    expect((await app.admin.get('/api/v1/admin/billing/revenue?month=2026-11', f1)).body).toMatchObject({
      month: '2026-11',
      invoicedPaise: 0,
    });
    expect((await app.admin.get('/api/v1/admin/subscriptions', asStaff('x1:orders.admin.read'))).status).toBe(403);
  });
});
