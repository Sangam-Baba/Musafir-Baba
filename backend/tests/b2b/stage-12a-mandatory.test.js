// @ts-check
/**
 * Stage 12 part A mandatory tests (D36): the dashboard without booking. This file holds "the same property on the
 * website and the dashboard — identical availability, each its own price" and "no hotel rate or margin ever reaches a
 * client". Also covered: two clients' markups isolated and the selling price never charged →
 * hotel-search-selling-price.test.js; category prices and category-limited hotels → client-categories.test.js;
 * live rooms only for LIVE properties → hotel-search-live.test.js. Part B tests (booking, wallet, usage) come with part B.
 */
import { describe, expect, it } from 'vitest';

import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { ClientMarkupRecord, MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    ClientMarkupRecord,
    MarginRuleRecord,
    SigningKeyRecord,
    CancellationPolicyRecord,
    RatePlanRecord,
    InventoryDayRecord,
    RateDayRecord,
    ChangeLogRecord,
  ],
});
const stay = { checkIn: '2026-12-01', checkOut: '2026-12-03', rooms: [{ adults: 2, childrenAges: [] }] };
const HIDDEN = /netPaise|marginPaise|hotelGst|hotelPayable|ruleId|"70000"|hotelOrgId/;

describe('website and dashboard', () => {
  it('the same property: identical rooms and availability, website price on the website, B2B price on the dashboard', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app, { rooms: 3 });
    const c = await clientOwner(app, 'owner@trips.in');
    const web = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body;
    const dash = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token))).body;
    const shape = (/** @type {any} */ b) => b.offers.map((/** @type {any} */ o) => [o.roomTypeId, o.ratePlanId, o.roomsLeft]);
    expect(shape(dash)).toEqual(shape(web));
    expect(web.offers[0].price.totalPaise).toBe(199500); // 2 × (₹700 + ₹250) + 5 %
    expect(dash.offers[0].price.totalPaise).toBe(178500); // 2 × (₹700 + ₹150) + 5 %
    // a calendar change shows on both at once
    await app.srv.put(
      `${h.base}/calendar`,
      {
        requestId: 'req-rooms-1',
        from: '2026-12-01',
        to: '2026-12-03',
        weekdays: null,
        rooms: [{ roomTypeId: h.room, total: 1 }],
        rates: [],
      },
      auth(h.token),
    );
    const web2 = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body;
    const dash2 = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token))).body;
    expect(web2.offers[0].roomsLeft).toBe(1);
    expect(dash2.offers[0].roomsLeft).toBe(1);
  });
});

describe('nothing private reaches a client', () => {
  it('search, offers and price check for a B2B client carry no hotel rate, margin or rule', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const c = await clientOwner(app, 'owner@trips.in');
    await app.srv.put(
      '/api/v1/markups',
      { enabled: true, adjustment: { type: 'PERCENT', value: 1000 }, overrides: [] },
      { ...auth(c.token), 'if-match': '"0"' },
    );
    const search = (await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay }, auth(c.token)))
      .body;
    const offers = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token))).body;
    const check = (await app.srv.post('/api/v1/hotels/offers/price-check', { priceToken: offers.offers[0].priceToken }, auth(c.token)))
      .body;
    for (const body of [search, offers, check]) expect(JSON.stringify(body)).not.toMatch(HIDDEN);
    expect(offers.offers[0].price).toMatchObject({ sellPaise: 170000, igstPaise: 8500, totalPaise: 178500 }); // the client's own price lines only
  });
});
