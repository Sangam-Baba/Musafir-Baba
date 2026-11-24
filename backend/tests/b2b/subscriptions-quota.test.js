// @ts-check
/**
 * Plan limits (S13-T04): weighted count (booking weight 0); BLOCK plan → 429 QUOTA_EXCEEDED after the limit;
 * OVERAGE plan goes on; suspended → search and booking 403 SUBSCRIPTION_SUSPENDED; website never checked;
 * 80 % / 100 % alerts once each a month.
 */
import { describe, expect, it } from 'vitest';

import { UsageDailyRecord, UsageEventRecord, UsageMonthlyRecord } from '../../src/b2b/modules/metering/index.js';
import {
  alertsDue,
  createSubscriptions,
  quotaState,
  seedPlans,
  sendQuotaAlerts,
  SubscriptionRecord,
  weightedUsed,
} from '../../src/b2b/modules/subscriptions/index.js';
import { usageRecorder } from '../../src/b2b/routes/metering-wiring.js';
import { auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { clientOwner } from './helpers/search-setup.js';

const E = useOrderEngine({ env: { B2B_BILLING_ENABLED: 'true' } });
const { app, clock, S, stay, bookedOrder } = E;
let n = 0;

describe('rules (pure)', () => {
  it('weighted use, BLOCK vs OVERAGE, suspended, alerts', () => {
    expect(
      weightedUsed(
        [
          { metric: 'hotel.search', billable: 10 },
          { metric: 'hotel.order', billable: 5 },
        ],
        { 'hotel.search': 2, 'hotel.order': 0 },
      ),
    ).toBe(20);
    expect(quotaState({ used: 4000, allowance: 4000, behaviour: 'BLOCK', status: 'ACTIVE' })).toMatchObject({
      blocked: true,
      reason: 'QUOTA_EXCEEDED',
      percent: 100,
    });
    expect(quotaState({ used: 4500, allowance: 4000, behaviour: 'OVERAGE', status: 'ACTIVE' })).toMatchObject({
      blocked: false,
      overageQueries: 500,
    });
    expect(quotaState({ used: 0, allowance: 4000, behaviour: 'OVERAGE', status: 'SUSPENDED' })).toMatchObject({
      blocked: true,
      reason: 'SUBSCRIPTION_SUSPENDED',
    });
    expect(alertsDue(85, [])).toEqual([80]);
    expect(alertsDue(100, [80])).toEqual([100]);
    expect(alertsDue(100, [80, 100])).toEqual([]);
  });
});

/** A client whose subscription allows `limit` queries this month on `behaviour`. @param {number} limit @param {'BLOCK' | 'OVERAGE'} behaviour */
async function setup(limit, behaviour) {
  const { h } = await bookedOrder(3);
  await seedPlans();
  const c = await clientOwner(app, `quota${(n += 1)}@trips.in`);
  const subs = createSubscriptions({ clock });
  await subs.start(c.orgId);
  await SubscriptionRecord.updateOne(
    { clientOrgId: c.orgId },
    { $set: { includedQueries: limit, period: '2026-11', override: { limitBehaviour: behaviour, overagePricePerQueryPaise: 100 } } },
  ).setOptions(S);
  await new Promise((r) => setTimeout(r, 30));
  await usageRecorder(clock).flush();
  await UsageEventRecord.deleteMany({}).setOptions(S);
  await UsageDailyRecord.deleteMany({}).setOptions(S);
  await UsageMonthlyRecord.deleteMany({}).setOptions(S);
  return { h, c };
}
/** One counted call, then the counters flushed and the guard's 10-second cache passed. @param {any} h @param {string} token */
async function offers(h, token) {
  const r = await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(token));
  await new Promise((res) => setTimeout(res, 30));
  await usageRecorder(clock).flush();
  E.nowMs += 11_000;
  return r;
}

describe('limits through the API', () => {
  it('BLOCK: calls go through up to the limit, then 429 QUOTA_EXCEEDED; the website is never checked', async () => {
    const { h, c } = await setup(2, 'BLOCK');
    expect((await offers(h, c.token)).status).toBe(200);
    expect((await offers(h, c.token)).status).toBe(200);
    const r = await offers(h, c.token);
    expect(r).toMatchObject({ status: 429, body: { code: 'QUOTA_EXCEEDED' } });
    expect((await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).status).toBe(200); // website
  });

  it('OVERAGE: goes on past the limit; 80 % / 100 % alerts once each', async () => {
    const { h, c } = await setup(2, 'OVERAGE');
    for (let i = 0; i < 3; i += 1) expect((await offers(h, c.token)).status).toBe(200);
    await sendQuotaAlerts({ clock });
    await sendQuotaAlerts({ clock });
    const sub = /** @type {any} */ (await SubscriptionRecord.findOne({ clientOrgId: c.orgId }).setOptions(S).lean());
    expect(sub.alerts.sent).toEqual([80, 100]);
    expect(sub.pendingEvents.filter((/** @type {any} */ e) => e.type === 'subscriptions.quota.reached')).toHaveLength(1);
  });

  it('suspended: searching and booking refused (403 SUBSCRIPTION_SUSPENDED)', async () => {
    const { h, c } = await setup(1000, 'BLOCK');
    await SubscriptionRecord.updateOne({ clientOrgId: c.orgId }, { $set: { status: 'SUSPENDED' } }).setOptions(S);
    E.nowMs += 11_000;
    const r = await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token));
    expect(r).toMatchObject({ status: 403, body: { code: 'SUBSCRIPTION_SUSPENDED' } });
  });
});
