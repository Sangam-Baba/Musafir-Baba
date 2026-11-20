// @ts-check
/** Admin price simulator (S05-T09): sample rate, a real property's calendar, draft rules, which rule applied, reach. */
import { describe, expect, it } from 'vitest';

import { evictCachedPrefix } from '../../src/b2b/core/cache.js';
import { CityRecord, PropertyRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import {
  CancellationPolicyRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MarginRuleRecord, seedDefaultMarginRules, seedPricingSettings, seedTaxRules } from '../../src/b2b/modules/pricing/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [MarginRuleRecord, CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord],
});

const SIM = asStaff('s1:pricing.simulator.use,pricing.rules.read,pricing.rules.propose');
const READER = asStaff('r1:pricing.rules.read');
const URL = '/api/v1/admin/pricing/simulate';

/** Starter rules, rates and settings; rules changed directly in the database (no events) → drop cached pricing data. */
async function seed() {
  await Promise.all([seedTaxRules(), seedDefaultMarginRules({ clock }), seedPricingSettings()]);
  evictCachedPrefix('pricing:');
}

/** A Mumbai hotel (state 27) with one room type, a room-only plan and ₹700 for 2 guests on 1–2 Dec. */
async function mumbaiHotel() {
  const h = await app.hotelWithProperty();
  const mumbai = /** @type {any} */ (await CityRecord.findOne({ slug: 'mumbai' }).lean());
  const base = `/api/v1/hotel/properties/${h.propertyId}`;
  const v = (await app.srv.get(base, auth(h.token))).body.version;
  const loc = {
    cityId: String(mumbai._id),
    line1: '12 Marine Drive',
    pin: '400020',
    lat: mumbai.location.coordinates[1] + 0.01,
    lng: mumbai.location.coordinates[0],
  };
  expect((await app.srv.put(`${base}/sections/location`, loc, { ...auth(h.token), 'if-match': `"${v}"` })).status).toBe(200);
  const room = await app.roomType(h.token, h.propertyId);
  const policy = (
    await app.srv.post(
      `${base}/cancellation-policies`,
      { name: 'Flexible', nonRefundable: false, rules: [], noShow: { type: 'PERCENT', value: 100 } },
      auth(h.token),
    )
  ).body.id;
  const plan = (
    await app.srv.post(
      `${base}/rate-plans`,
      {
        name: 'Room only',
        mealPlanKey: 'ep',
        roomTypeIds: [room],
        cancellationPolicyId: policy,
        pricingModel: 'PER_OCCUPANCY',
        minAdvanceDays: 0,
        maxAdvanceDays: 365,
        derived: null,
      },
      auth(h.token),
    )
  ).body.id;
  const edit = {
    requestId: 'req-000001',
    from: '2026-12-01',
    to: '2026-12-03',
    weekdays: null,
    rooms: [{ roomTypeId: room, total: 5 }],
    rates: [{ ratePlanId: plan, roomTypeId: room, prices: [{ guests: 2, amount: 70000 }] }],
  };
  expect((await app.srv.put(`${base}/calendar`, edit, auth(h.token))).status).toBe(200);
  return { ...h, room, plan, cityId: String(mumbai._id) };
}

describe('sample rate', () => {
  it('₹700 in Delhi → website ₹997.50 with CGST + SGST, and which rule gave the margin', async () => {
    await seed();
    const r = await app.admin.post(URL, { channel: 'WEBSITE', sample: { netPaise: 70000, date: '2026-12-01', stateCode: '07' } }, SIM);
    expect(r.status).toBe(200);
    const b = r.body.results[0].breakdown;
    expect(b.totals).toMatchObject({
      netPaise: 70000,
      marginPaise: 25000,
      sellPaise: 95000,
      cgstPaise: 2375,
      sgstPaise: 2375,
      totalPaise: 99750,
    });
    expect(r.body.ruleNames[b.lines[0].ruleId]).toBe('Website default');
    const b2b = await app.admin.post(URL, { channel: 'B2B_PORTAL', sample: { netPaise: 70000, date: '2026-12-01', stateCode: '07' } }, SIM);
    expect(b2b.body.results[0].breakdown.totals.totalPaise).toBe(89250);
  });

  it('a draft rule can be tried before approval (and replaces what it names), without taking effect', async () => {
    await seed();
    const old = await MarginRuleRecord.findOne({ key: 'default-website' }).lean();
    const draft = (
      await app.admin.post(
        '/api/v1/admin/margin-rules',
        {
          name: 'Website 20 %',
          priority: 0,
          match: { channels: ['WEBSITE'] },
          adjustment: { type: 'PERCENT', value: 2000 },
          replaces: String(old?._id),
        },
        SIM,
      )
    ).body;
    const sample = { channel: 'WEBSITE', sample: { netPaise: 70000, date: '2026-12-01', stateCode: '07' } };
    const tried = await app.admin.post(URL, { ...sample, draftRuleIds: [draft.id] }, SIM);
    expect(tried.body.results[0].breakdown.totals).toMatchObject({ sellPaise: 84000, gstPaise: 4200, totalPaise: 88200 });
    expect(tried.body.draftsUsed).toEqual([draft.id]);
    expect((await app.admin.post(URL, sample, SIM)).body.results[0].breakdown.totals.totalPaise).toBe(99750); // not in force
  });

  it('not sellable is shown as a result, not an error', async () => {
    await seed();
    await MarginRuleRecord.updateMany({}, { $set: { status: 'RETIRED' } });
    evictCachedPrefix('pricing:'); // what the rule.retired event does
    const r = await app.admin.post(URL, { channel: 'WEBSITE', sample: { netPaise: 70000, date: '2026-12-01', stateCode: '07' } }, SIM);
    expect(r.body.results[0]).toEqual({
      ok: false,
      problem: { code: 'NOT_SELLABLE', reason: 'NO_MARGIN_RULE', channel: 'WEBSITE', date: '2026-12-01' },
    });
  });
});

describe('a real property', () => {
  it("prices every sellable offer from the hotel's calendar; Mumbai → IGST", async () => {
    await seed();
    const h = await mumbaiHotel();
    const r = await app.admin.post(
      URL,
      {
        channel: 'WEBSITE',
        property: { propertyId: h.propertyId, checkIn: '2026-12-01', checkOut: '2026-12-03', rooms: [{ adults: 2, children: 0 }] },
      },
      SIM,
    );
    expect(r.status).toBe(200);
    expect(r.body.property).toMatchObject({ id: h.propertyId, stateCode: '27' });
    expect(r.body.offers).toHaveLength(1);
    expect(r.body.offers[0]).toMatchObject({ roomTypeId: h.room, ratePlanId: h.plan, roomTypeName: 'Deluxe', ok: true });
    expect(r.body.offers[0].breakdown.totals).toMatchObject({
      netPaise: 140000,
      sellPaise: 190000,
      igstPaise: 9500,
      cgstPaise: 0,
      totalPaise: 199500,
    });
  });

  it('no rooms on those nights → no offers', async () => {
    await seed();
    const h = await mumbaiHotel();
    const r = await app.admin.post(
      URL,
      {
        channel: 'WEBSITE',
        property: { propertyId: h.propertyId, checkIn: '2026-12-05', checkOut: '2026-12-06', rooms: [{ adults: 2, children: 0 }] },
      },
      SIM,
    );
    expect(r.body.offers).toEqual([]);
  });
});

describe('reach and access', () => {
  it('how many live properties a rule covers', async () => {
    await seed();
    const h = await mumbaiHotel();
    await PropertyRecord.updateOne({ _id: h.propertyId }, { $set: { status: 'LIVE', starRating: 4 } }).setOptions(SYSTEM);
    const rule = async (/** @type {object} */ match) =>
      (
        await app.admin.post(
          '/api/v1/admin/margin-rules',
          { name: 'Reach test', priority: 1, match, adjustment: { type: 'FIXED_PER_NIGHT', value: 100 } },
          SIM,
        )
      ).body.id;
    const reach = async (/** @type {string} */ id) => (await app.admin.get(`/api/v1/admin/margin-rules/${id}/reach`, READER)).body;
    expect(await reach(await rule({ cityId: h.cityId }))).toEqual({ count: 1, capped: false });
    expect(await reach(await rule({ cityId: h.cityId, starRating: 5 }))).toEqual({ count: 0, capped: false });
    expect(await reach(await rule({ starRating: 4 }))).toEqual({ count: 1, capped: false });
    expect(await reach(await rule({ propertyId: '64b0000000000000000000aa' }))).toEqual({ count: 0, capped: false });
  });

  it('only simulator users simulate; exactly one of sample / property', async () => {
    await seed();
    const sample = { channel: 'WEBSITE', sample: { netPaise: 70000, date: '2026-12-01', stateCode: '07' } };
    expect((await app.admin.post(URL, sample, READER)).status).toBe(403);
    expect((await app.admin.post(URL, { channel: 'WEBSITE' }, SIM)).status).toBe(400);
  });
});
