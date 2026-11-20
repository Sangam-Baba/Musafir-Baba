// @ts-check
/**
 * Stage 06 mandatory tests (plan Stage 06 §7). This file holds the search contract (exact fields — nothing private
 * can slip in), cache clearing when a listing changes, and a local timing smoke check. The rest of the list:
 * - channel visibility filter; prices per channel; no token in search results          → hotel-search.test.js,
 *                                                                                        hotel-search-catalog.test.js
 * - results follow inventory and an approved rule change at once (no stale cache)       → hotel-search.test.js
 * - rate limiter atomic under concurrency (125 parallel → exactly 120)                  → hotel-search-destinations.test.js
 * - price check OK / PRICE_CHANGED / SOLD_OUT; token tamper / other buyer               → hotel-offers.test.js
 * - live rooms only for LIVE properties                                                 → hotel-search-live.test.js
 * - performance budgets on staging data                                                 → DEF-031 (scripts/b2b/load-test.js)
 */
import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import { SIGNALS_COLLECTION } from '../../src/b2b/core/realtime/signals.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { createSearchCacheSignals } from '../../src/b2b/modules/hotel-search/index.js';
import { MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { useInventoryApp } from './helpers/inventory-app.js';
import { seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
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
const keys = (/** @type {object} */ o) => Object.keys(o).sort();

describe('contract', () => {
  it('search, offers and price check answer exactly these fields', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const search = (await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay })).body;
    expect(keys(search)).toEqual(['channel', 'checkIn', 'checkOut', 'currency', 'items', 'nextCursor', 'nights', 'rooms', 'total']);
    expect(keys(search.items[0])).toEqual([
      'amenities',
      'areaName',
      'cityName',
      'coverUrl',
      'distanceKm',
      'from',
      'id',
      'location',
      'name',
      'publicRef',
      'slug',
      'soldOut',
      'starRating',
    ]);
    expect(keys(search.items[0].from)).toEqual([
      'gstIncluded',
      'mealPlanKey',
      'perNightPaise',
      'planName',
      'refundable',
      'roomTypeName',
      'totalPaise',
    ]);
    const offers = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body;
    expect(keys(offers)).toEqual(['channel', 'checkIn', 'checkOut', 'offers', 'property', 'soldOut']);
    expect(keys(offers.offers[0])).toEqual([
      'cancellation',
      'mealPlanKey',
      'planName',
      'price',
      'priceToken',
      'priceTokenExpiresAt',
      'ratePlanId',
      'refundable',
      'roomTypeId',
      'roomTypeName',
      'roomsLeft',
    ]);
    expect(keys(offers.offers[0].price)).toEqual(['checkIn', 'checkOut', 'currency', 'gstPaise', 'nights', 'rooms', 'totalPaise']);
    const check = (await app.srv.post('/api/v1/hotels/offers/price-check', { priceToken: offers.offers[0].priceToken })).body;
    expect(keys(check)).toEqual(['price', 'priceToken', 'priceTokenExpiresAt', 'quotedTotalPaise', 'status']);
  });
});

describe('caches', () => {
  it('a listing change tells every process to drop its search caches', async () => {
    await createSearchCacheSignals({ clock, logger: /** @type {any} */ ({ warn: () => {} }) }).handle();
    const signal = await app.mongo.db.collection(SIGNALS_COLLECTION).find({}).sort({ $natural: -1 }).limit(1).next();
    expect(signal).toMatchObject({ room: 'cache:evict', data: { prefix: 'search:' } });
  });
});

describe('timing (local smoke check — the real budgets need staging data, DEF-031)', () => {
  it('a city search over 20 live hotels stays well under the 800 ms budget', async () => {
    await seedPricing(clock);
    let cityId = '';
    for (let i = 0; i < 20; i += 1) cityId = (await sellableHotel(app, { price: 50000 + i * 1000 })).cityId;
    const times = [];
    for (let i = 0; i < 10; i += 1) {
      const t0 = performance.now();
      const r = await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: cityId }, ...stay });
      times.push(performance.now() - t0);
      expect(r.body.total).toBe(20);
    }
    times.sort((a, b) => a - b);
    expect(times[8]).toBeLessThan(800);
  }, 120_000);
});
