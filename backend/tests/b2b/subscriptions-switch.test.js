// @ts-check
/**
 * Stage 13 is switched off by default (`B2B_BILLING_ENABLED`): client plan pages answer 503 BILLING_NOT_ENABLED, no
 * subscription starts, searching is never limited; the background parts are empty; admin can prepare plans.
 */
import { describe, expect, it } from 'vitest';

import { PlanVersionRecord, seedPlans, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import { subscriptionParts } from '../../src/b2b/routes/subscriptions-wiring.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-10T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({ clock, models: [SubscriptionRecord] });

describe('billing switched off', () => {
  it('client pages 503, nothing starts, no background work; admin can prepare plans', async () => {
    await PlanVersionRecord.deleteMany({});
    await seedPlans();
    const c = await clientOwner(app, 'switch-off@trips.in');
    for (const p of ['/subscription', '/plans', '/billing/invoices'])
      expect(await app.srv.get(`/api/v1${p}`, auth(c.token))).toMatchObject({ status: 503, body: { code: 'BILLING_NOT_ENABLED' } });
    expect(await SubscriptionRecord.countDocuments({}).setOptions(S)).toBe(0);
    const off = subscriptionParts(clock, {});
    expect(off.consumers).toEqual([]);
    expect(off.schedules).toEqual([]);
    expect(subscriptionParts(clock, { B2B_BILLING_ENABLED: 'true' }).schedules.length).toBeGreaterThan(0);
    expect((await app.admin.get('/api/v1/admin/plans', asStaff('f1:subscriptions.plan.manage'))).status).toBe(200);
  });
});
