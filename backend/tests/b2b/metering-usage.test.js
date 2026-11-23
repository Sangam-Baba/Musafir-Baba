// @ts-check
/**
 * Usage counting (S12-T20, plan §8): N billable calls → N events after the flush, counters per day / month / person;
 * failures not counted; website traffic recorded under `platform`, never billable; autocomplete free; the refresh
 * header: one free refresh per property per person per 60 seconds, never for API keys; stop() flushes what is left;
 * the nightly recount fixes a counter from the events.
 */
import { describe, expect, it } from 'vitest';

import { createLogger } from '../../src/b2b/core/logger.js';
import {
  createUsageRecorder,
  recountDay,
  UsageDailyRecord,
  UsageEventRecord,
  UsageMonthlyRecord,
  usageOf,
} from '../../src/b2b/modules/metering/index.js';
import { usageRecorder } from '../../src/b2b/routes/metering-wiring.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { clientOwner } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, stay, bookedOrder } = E;

describe('rules (pure)', () => {
  it('what counts', () => {
    const base = { clientOrgId: 'c1', apiKey: false, refresh: false, lastFreeRefreshAt: null, now: 1_000_000 };
    expect(usageOf({ ...base, metric: 'hotel.search' })).toEqual({ record: true, billable: true, freeRefresh: false });
    expect(usageOf({ ...base, metric: 'hotel.destinations' })).toEqual({ record: false, billable: false, freeRefresh: false }); // autocomplete free
    expect(usageOf({ ...base, clientOrgId: null, metric: 'hotel.offers' })).toEqual({ record: true, billable: false, freeRefresh: false }); // website
    expect(usageOf({ ...base, metric: 'hotel.offers', refresh: true })).toMatchObject({ billable: false, freeRefresh: true });
    expect(usageOf({ ...base, metric: 'hotel.offers', refresh: true, lastFreeRefreshAt: 1_000_000 - 30_000 })).toMatchObject({
      billable: true,
    }); // within 60 s
    expect(usageOf({ ...base, metric: 'hotel.offers', refresh: true, lastFreeRefreshAt: 1_000_000 - 60_000 })).toMatchObject({
      billable: false,
    });
    expect(usageOf({ ...base, metric: 'hotel.offers', refresh: true, apiKey: true })).toMatchObject({ billable: true }); // never for API keys
    expect(usageOf({ ...base, metric: 'hotel.search', refresh: true })).toMatchObject({ billable: true }); // only offers / price check
  });
});

describe('recorder', () => {
  it('N records → N events after the flush; counters per day, month and person; stop() flushes the rest', async () => {
    await UsageEventRecord.deleteMany({}).setOptions(S);
    await UsageDailyRecord.deleteMany({}).setOptions(S);
    await UsageMonthlyRecord.deleteMany({}).setOptions(S);
    const r = createUsageRecorder({ clock, logger: createLogger({ write: () => {} }), flushAt: 1000, flushEveryMs: 60_000 });
    for (let i = 0; i < 250; i += 1)
      r.record({
        orgId: 'c9',
        userId: i % 2 ? 'u1' : 'u2',
        channel: 'B2B_PORTAL',
        metric: 'hotel.search',
        billable: i % 5 !== 0,
        statusCode: 200,
        requestId: `r${i}`,
      });
    await r.flush();
    r.record({
      orgId: 'c9',
      userId: 'u1',
      channel: 'B2B_PORTAL',
      metric: 'hotel.offers',
      billable: true,
      statusCode: 200,
      requestId: 'last',
    });
    await r.stop();
    expect(await UsageEventRecord.countDocuments({ orgId: 'c9' }).setOptions(S)).toBe(251);
    const day = /** @type {any} */ (await UsageDailyRecord.findOne({ orgId: 'c9', metric: 'hotel.search' }).setOptions(S).lean());
    expect(day).toMatchObject({ count: 250, billable: 200, byUser: { u1: 125, u2: 125 } });
    expect(await UsageMonthlyRecord.countDocuments({ orgId: 'c9' }).setOptions(S)).toBe(2);
    await UsageDailyRecord.updateOne({ _id: day._id }, { $set: { count: 7, billable: 7 } }).setOptions(S); // a counter gone wrong
    await recountDay(day.day);
    expect(await UsageDailyRecord.findOne({ _id: day._id }).setOptions(S).lean()).toMatchObject({ count: 250, billable: 200 });
  });
});

describe('through the API', () => {
  it('client calls counted (billable), failures not, website under platform; a refresh within 60 s counts', async () => {
    const { h } = await bookedOrder(3);
    const c = await clientOwner(app, 'usage@trips.in');
    await new Promise((r) => setTimeout(r, 50));
    await usageRecorder(clock).flush(); // what the setup's own website calls left behind
    await UsageEventRecord.deleteMany({}).setOptions(S);
    await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token));
    await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, { ...auth(c.token), 'x-mb-refresh': 'realtime' }); // free
    await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, { ...auth(c.token), 'x-mb-refresh': 'realtime' }); // within 60 s → counts
    await app.srv.post('/api/v1/hotels/no-such-hotel-xyz/offers', stay, auth(c.token)); // 404 → not counted
    await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay); // the website
    await new Promise((r) => setTimeout(r, 50)); // `finish` handlers
    await usageRecorder(clock).flush();
    const mine = await UsageEventRecord.find({ orgId: c.orgId }).setOptions(S).lean();
    expect(mine.map((e) => e.billable)).toEqual([true, false, true]);
    expect(mine.every((e) => e.metric === 'hotel.offers' && e.userId)).toBe(true);
    const site = await UsageEventRecord.find({ orgId: 'platform' }).setOptions(S).lean();
    expect(site).toHaveLength(1);
    expect(site.every((e) => !e.billable)).toBe(true);

    // the client's screen and MusafirBaba's show the same numbers
    const month = new Date(clock.now().getTime() + 330 * 60_000).toISOString().slice(0, 7);
    const own = (await app.srv.get(`/api/v1/usage?month=${month}`, auth(c.token))).body;
    expect(own.byMetric['hotel.offers']).toMatchObject({ count: 3, billable: 2 });
    const admin = (await app.admin.get(`/api/v1/admin/usage?month=${month}`, asStaff('f1:metering.admin.read'))).body.data;
    expect(admin.find((/** @type {any} */ r) => r.orgId === c.orgId)).toMatchObject({ billable: own.billable, name: 'Trips Co' });
    const one = (await app.admin.get(`/api/v1/admin/usage/${c.orgId}?month=${month}`, asStaff('f1:metering.admin.read'))).body;
    expect(one).toEqual(own);
    expect((await app.admin.get(`/api/v1/admin/usage?month=${month}`, asStaff('f2:orders.admin.read'))).status).toBe(403);
  });
});
