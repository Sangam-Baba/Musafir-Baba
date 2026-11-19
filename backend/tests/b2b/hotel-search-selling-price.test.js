// @ts-check
/** "My selling price" (S12-T02): a B2B client's own markup shown on search and offers — display only, never charged. */
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
const stay = { checkIn: '2026-12-01', checkOut: '2026-12-02', rooms: [{ adults: 2, childrenAges: [] }] };

/** @param {string} token @param {number} bps */
const setMarkup = async (token, bps) =>
  expect(
    (
      await app.srv.put(
        '/api/v1/markups',
        { enabled: true, adjustment: { type: 'PERCENT', value: bps }, overrides: [] },
        { ...auth(token), 'if-match': '"0"' },
      )
    ).status,
  ).toBe(200);

describe('my selling price', () => {
  it("a client's 10 % markup on its B2B price: search and offers show it; the price and the token stay MusafirBaba's", async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const c = await clientOwner(app, 'owner@trips.in');
    await setMarkup(c.token, 1000);
    const search = await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay }, auth(c.token));
    // B2B: (₹700 + ₹150) + 5 % = ₹892.50; markup 10 % of ₹850 = ₹85 → ₹977.50
    expect(search.body.items[0].from).toMatchObject({ totalPaise: 89250, sellingPricePaise: 97750, sellingPerNightPaise: 97750 });
    const offers = await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token));
    expect(offers.body.offers[0]).toMatchObject({ price: { totalPaise: 89250 }, sellingPricePaise: 97750 });
    const check = await app.srv.post('/api/v1/hotels/offers/price-check', { priceToken: offers.body.offers[0].priceToken }, auth(c.token));
    expect(check.body).toMatchObject({ status: 'OK', quotedTotalPaise: 89250, price: { totalPaise: 89250 } }); // never charged
  });

  it('each client sees only its own markup; none set → no selling price; the website never gets the field', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const a = await clientOwner(app, 'owner@a.in');
    const b = await clientOwner(app, 'owner@b.in');
    const none = await clientOwner(app, 'owner@none.in');
    await setMarkup(a.token, 1000);
    await setMarkup(b.token, 2000);
    const offer = async (/** @type {Record<string, string>} */ headers) =>
      (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, headers)).body.offers[0];
    expect((await offer(auth(a.token))).sellingPricePaise).toBe(97750);
    expect((await offer(auth(b.token))).sellingPricePaise).toBe(106250); // 20 % of ₹850 = ₹170
    expect((await offer(auth(none.token))).sellingPricePaise).toBeNull();
    const website = await offer({});
    expect('sellingPricePaise' in website).toBe(false);
    const search = await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay }, auth(none.token));
    expect('sellingPricePaise' in search.body.items[0].from).toBe(false);
  });
});
