// @ts-check
/** Hotel search (S06-T04): live hotels with rooms for the stay, "from" prices per channel, filters, sort, paging, limits. */
import { describe, expect, it } from 'vitest';

import { evictCachedPrefix } from '../../src/b2b/core/cache.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MarginRuleRecord } from '../../src/b2b/modules/pricing/index.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [MarginRuleRecord, CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord, ChangeLogRecord],
});
const URL = '/api/v1/hotels/search';
/** @param {string} cityId @param {Record<string, unknown>} [extra] */
const body = (cityId, extra = {}) => ({
  destination: { type: 'CITY', id: cityId },
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  rooms: [{ adults: 2, childrenAges: [] }],
  ...extra,
});

describe('website search', () => {
  it('live hotels with rooms, final "from" price incl. GST for the website — no token, no hotel rate', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app, { name: 'Sea View', price: 70000 });
    const r = await app.srv.post(URL, body(h.cityId));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ total: 1, nights: 2, rooms: 1, channel: 'WEBSITE', currency: 'INR', nextCursor: null });
    // 2 nights × (₹700 + ₹250) + 5 % IGST (Maharashtra hotel, Delhi issuer) = ₹1,995
    expect(r.body.items[0]).toMatchObject({
      publicRef: h.ref,
      name: 'Sea View',
      cityName: 'Mumbai',
      soldOut: false,
      from: {
        totalPaise: 199500,
        perNightPaise: 99750,
        gstIncluded: true,
        roomTypeName: 'Deluxe',
        planName: 'Room only',
        mealPlanKey: 'ep',
        refundable: true,
      },
    });
    const text = JSON.stringify(r.body);
    for (const hidden of ['token', 'netPaise', 'margin', '70000', 'hotelOrgId', 'breakdown']) expect(text).not.toContain(hidden);
  });

  it('the same hotel for a signed-in B2B client: B2B price', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const c = await clientOwner(app, 'owner@trips.in');
    const r = await app.srv.post(URL, body(h.cityId), auth(c.token));
    expect(r.body.channel).toBe('B2B_PORTAL');
    expect(r.body.items[0].from.totalPaise).toBe(178500); // 2 × (₹700 + ₹150) × 1.05
  });

  it('channel visibility: a B2B-only hotel is never on the website; sold-out hotels drop out unless asked for by reference', async () => {
    await seedPricing(clock);
    const shown = await sellableHotel(app, { name: 'Shown' });
    await sellableHotel(app, { name: 'B2B only', visibility: { website: false, b2b: true, clientCategories: [], sellFrom: null } });
    const full = await sellableHotel(app, { name: 'Full', rooms: 0 });
    const r = await app.srv.post(URL, body(shown.cityId));
    expect(r.body.items.map((/** @type {any} */ i) => i.name)).toEqual(['Shown']);
    const byRef = await app.srv.post(URL, { ...body(shown.cityId), destination: undefined, propertyRefs: [full.ref] });
    expect(byRef.body.items).toEqual([expect.objectContaining({ name: 'Full', soldOut: true, from: null })]);
  });
});

describe('filters, sort, paging', () => {
  it('stars, price per night, refundable only, meal plans; sort by price; cursor pages', async () => {
    await seedPricing(clock);
    const cheap = await sellableHotel(app, { name: 'Cheap', price: 50000, stars: 2 });
    await sellableHotel(app, { name: 'Mid', price: 90000, stars: 4, nonRefundable: true });
    await sellableHotel(app, { name: 'Lux', price: 300000, stars: 5 });
    const names = async (/** @type {Record<string, unknown>} */ extra) =>
      (await app.srv.post(URL, body(cheap.cityId, extra))).body.items.map((/** @type {any} */ i) => i.name);
    expect(await names({})).toEqual(['Lux', 'Mid', 'Cheap']); // recommended: stars first
    expect(await names({ sort: 'price' })).toEqual(['Cheap', 'Mid', 'Lux']);
    expect(await names({ filters: { star: [4, 5] } })).toEqual(['Lux', 'Mid']);
    expect(await names({ filters: { refundableOnly: true }, sort: 'price' })).toEqual(['Cheap', 'Lux']);
    expect(await names({ filters: { priceRange: { maxPaise: 125000 } }, sort: 'price' })).toEqual(['Cheap', 'Mid']); // per night incl. GST
    expect(await names({ filters: { mealPlans: ['cp'] } })).toEqual([]);
    const p1 = await app.srv.post(URL, body(cheap.cityId, { sort: 'price', limit: 2 }));
    expect(p1.body.items.map((/** @type {any} */ i) => i.name)).toEqual(['Cheap', 'Mid']);
    const p2 = await app.srv.post(URL, body(cheap.cityId, { sort: 'price', limit: 2, cursor: p1.body.nextCursor }));
    expect(p2.body).toMatchObject({ items: [expect.objectContaining({ name: 'Lux' })], nextCursor: null });
    const replay = await app.srv.post(URL, body(cheap.cityId, { sort: 'star', limit: 2, cursor: p1.body.nextCursor }));
    expect(replay.body.code).toBe('CURSOR_INVALID'); // a cursor belongs to its own search
  });

  it('near a point, nearest first', async () => {
    await seedPricing(clock);
    const a = await sellableHotel(app, { name: 'Near' });
    await sellableHotel(app, { name: 'Further' });
    const r = await app.srv.post(URL, { ...body(a.cityId), destination: undefined, near: { lat: 19.076, lng: 72.8777, radiusKm: 20 } });
    expect(r.body.items.map((/** @type {any} */ i) => i.name)).toEqual(['Near', 'Further']);
    expect(r.body.items[0].distanceKm).toEqual(expect.any(Number));
  });
});

describe('always current, and limits', () => {
  it('results follow the calendar and an approved rule change at once (no stale cache)', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    expect((await app.srv.post(URL, body(h.cityId))).body.total).toBe(1);
    await app.srv.put(
      `${h.base}/calendar`,
      {
        requestId: 'req-close-1',
        from: '2026-12-02',
        to: '2026-12-03',
        weekdays: null,
        rooms: [{ roomTypeId: h.room, stopSell: true }],
        rates: [],
      },
      auth(h.token),
    );
    expect((await app.srv.post(URL, body(h.cityId))).body.total).toBe(0);
    expect((await app.srv.post(URL, body(h.cityId, { checkOut: '2026-12-02' }))).body.total).toBe(1);
    await MarginRuleRecord.updateOne({ key: 'default-website' }, { $set: { 'adjustment.value': 35000 } });
    evictCachedPrefix('pricing:'); // what the rule-approved event does in every process
    expect((await app.srv.post(URL, body(h.cityId, { checkOut: '2026-12-02' }))).body.items[0].from.totalPaise).toBe(110250);
  });

  it('caps: rooms, children, ages, one destination, page size', async () => {
    const b = body('64b0000000000000000000c1');
    const bad = [
      { ...b, rooms: Array(10).fill({ adults: 1, childrenAges: [] }) },
      { ...b, rooms: [{ adults: 2, childrenAges: [1, 2, 3, 4, 5] }] },
      { ...b, rooms: [{ adults: 2, childrenAges: [18] }] },
      { ...b, propertyRefs: ['MBHT-AAAA-AAAA'] },
      { ...b, limit: 51 },
      { ...b, near: { lat: 19, lng: 72.8, radiusKm: 200 }, destination: undefined },
    ];
    for (const x of bad) expect((await app.srv.post(URL, x)).status).toBe(400);
    const long = await app.srv.post(URL, { ...b, checkOut: '2027-01-15' });
    expect(long.body).toMatchObject({ status: 422, code: 'DATE_RANGE_TOO_LONG' });
    expect((await app.srv.post(URL, { ...b, checkOut: '2026-12-01' })).body.code).toBe('DATE_RANGE_EMPTY');
  });
});
