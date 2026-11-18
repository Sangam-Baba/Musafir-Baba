// @ts-check
/** Offers (S06-T05) and price check (S06-T06): caller's prices, tokens, cancellation terms, OK / PRICE_CHANGED / SOLD_OUT. */
import { describe, expect, it } from 'vitest';

import { CancellationPolicyRecord, ChangeLogRecord, InventoryDayRecord, RateDayRecord, RatePlanRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({ clock, models: [MarginRuleRecord, SigningKeyRecord, CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord, ChangeLogRecord] });
const stay = { checkIn: '2026-12-01', checkOut: '2026-12-03', rooms: [{ adults: 2, childrenAges: [] }] };
const CHECK = '/api/v1/hotels/offers/price-check';

describe('offers', () => {
  it('website: every room × plan with the final price, cancellation terms and a price token — never the hotel rate', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const r = await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ property: { id: h.propertyId, publicRef: h.ref }, channel: 'WEBSITE', soldOut: false });
    expect(r.body.offers).toHaveLength(1);
    const o = r.body.offers[0];
    expect(o).toMatchObject({ roomTypeName: 'Deluxe', planName: 'Room only', mealPlanKey: 'ep', refundable: true, roomsLeft: 5, cancellation: expect.any(String), priceToken: expect.any(String) });
    expect(o.price).toEqual({ currency: 'INR', checkIn: '2026-12-01', checkOut: '2026-12-03', rooms: 1, nights: 2, totalPaise: 199500, gstPaise: 9500 });
    expect(JSON.stringify(r.body)).not.toMatch(/netPaise|marginPaise|hotelGst|"70000"|ruleId/);
  });

  it('B2B client: B2B price with GST lines per night, still no hotel rate', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const c = await clientOwner(app, 'owner@trips.in');
    const r = await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token));
    expect(r.body.channel).toBe('B2B_PORTAL');
    expect(r.body.offers[0].price).toMatchObject({ totalPaise: 178500, sellPaise: 170000, igstPaise: 8500, nightly: [expect.objectContaining({ sellPaise: 85000, rateBps: 500 }), expect.anything()] });
    expect(JSON.stringify(r.body)).not.toMatch(/netPaise|marginPaise|"70000"/);
  });

  it('hidden or unknown hotel → 404; no rooms → sold out', async () => {
    await seedPricing(clock);
    const hidden = await sellableHotel(app, { visibility: { website: false, b2b: true, clientCategories: [], sellFrom: null } });
    expect((await app.srv.post(`/api/v1/hotels/${hidden.ref}/offers`, stay)).status).toBe(404);
    expect((await app.srv.post('/api/v1/hotels/MBHT-0000-0000/offers', stay)).status).toBe(404);
    const full = await sellableHotel(app, { rooms: 0 });
    expect((await app.srv.post(`/api/v1/hotels/${full.ref}/offers`, stay)).body).toMatchObject({ soldOut: true, offers: [] });
  });
});

describe('price check', () => {
  /** @param {Awaited<ReturnType<typeof sellableHotel>>} h @param {Record<string, string>} [headers] */
  const tokenFor = async (h, headers = {}) => (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, headers)).body.offers[0].priceToken;

  it('unchanged → OK with a fresh token', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const r = await app.srv.post(CHECK, { priceToken: await tokenFor(h) });
    expect(r.body).toMatchObject({ status: 'OK', quotedTotalPaise: 199500, price: { totalPaise: 199500 }, priceToken: expect.any(String) });
  });

  it('the hotel changed its rate → PRICE_CHANGED with the old and new totals', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const token = await tokenFor(h);
    await app.srv.put(`${h.base}/calendar`, { requestId: 'req-raise-1', from: '2026-12-01', to: '2026-12-03', weekdays: null, rooms: [], rates: [{ ratePlanId: h.plan, roomTypeId: h.room, prices: [{ guests: 2, amount: 80000 }] }] }, auth(h.token));
    const r = await app.srv.post(CHECK, { priceToken: token });
    expect(r.body).toMatchObject({ status: 'PRICE_CHANGED', quotedTotalPaise: 199500, price: { totalPaise: 220500 } });
  });

  it('rooms gone → SOLD_OUT', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const token = await tokenFor(h);
    await app.srv.put(`${h.base}/calendar`, { requestId: 'req-close-1', from: '2026-12-02', to: '2026-12-03', weekdays: null, rooms: [{ roomTypeId: h.room, total: 0 }], rates: [] }, auth(h.token));
    expect((await app.srv.post(CHECK, { priceToken: token })).body).toEqual({ status: 'SOLD_OUT', quotedTotalPaise: 199500 });
  });

  it("a tampered token, or someone else's, is refused", async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const token = await tokenFor(h);
    const bad = await app.srv.post(CHECK, { priceToken: `${token.slice(0, -3)}abc` });
    expect(bad.body.code).toBe('PRICE_TOKEN_INVALID');
    const c = await clientOwner(app, 'owner@trips.in');
    const theirs = await app.srv.post(CHECK, { priceToken: token }, auth(c.token)); // a website token used by a B2B client
    expect(theirs.body.code).toBe('PRICE_TOKEN_NOT_YOURS');
  });
});
