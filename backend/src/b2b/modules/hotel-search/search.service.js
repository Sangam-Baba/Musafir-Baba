// @ts-check
/**
 * Hotel search (S06-T04): candidates (hotel-catalog, LIVE + visible on the caller's channel) → rooms free on every
 * night with a sellable plan (hotel-inventory `checkAvailability`, one batched call, ≤ 200 properties) → each option
 * priced for the caller's channel (pricing `quote` — website or B2B margins, GST incl.) → filters / sort / page.
 * Results carry "from" prices only — never a price token, never the hotel rate or the margin.
 * The same service answers every channel: the caller (decided by the search gateway) sets the prices.
 */
import { createCache } from '../../core/cache.js';
import { DomainError } from '../../core/errors.js';
import { MAX_STAY_NIGHTS, nights as stayNights } from '../hotel-inventory/index.js';
import { DEFAULT_PAGE, decodeCursor, queryKey, rankResults } from './domain/search.js';

/**
 * @typedef {import('../hotel-catalog/search-catalog.service.js').SearchProperty} SearchProperty
 * @typedef {import('./domain/caller.js').SearchCaller} SearchCaller
 * @typedef {{ adults: number, childrenAges: number[] }} RoomAsk
 * @typedef {{ type: 'CITY', id: string } | { type: 'AREA', id: string, cityId: string } | { type: 'PROPERTY', id: string }} Destination
 * @typedef {{ destination?: Destination, propertyRefs?: string[], near?: { lat: number, lng: number, radiusKm: number },
 *   checkIn: string, checkOut: string, rooms: RoomAsk[], filters?: import('./domain/search.js').Filters,
 *   sort?: typeof import('./domain/search.js').SORTS[number], cursor?: string | null, limit?: number }} SearchQuery
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   candidates: (q: { channel: 'WEBSITE' | 'B2B', clientCategory?: string | null, where: any }) => Promise<SearchProperty[]>,
 *   availability: (q: { properties: { id: string, timeZone: string, roomTypes: any[] }[], checkIn: string, checkOut: string, groups: { adults: number, children: number }[] }) =>
 *     Promise<{ propertyId: string, offers: { roomTypeId: string, ratePlanId: string, mealPlanKey: string, available: number, nightly: { date: string, amounts: number[] }[] }[] }[]>,
 *   planTerms: (ids: string[]) => Promise<Map<string, { name: string, mealPlanKey: string, refundable: boolean, cancellation: string }>>,
 *   quote: (q: import('../pricing/domain/quote.js').QuoteInput) => Promise<import('../pricing/domain/quote.js').PriceBreakdown>,
 *   gstRegistered: (hotelOrgId: string) => Promise<boolean>,
 * }} SearchDeps
 */

/** @param {SearchQuery} q */
function whereOf(q) {
  if (q.near) return { where: { near: q.near }, byRef: false };
  if (q.propertyRefs?.length) return { where: { refs: q.propertyRefs }, byRef: true };
  const d = q.destination;
  if (!d) throw new DomainError('DESTINATION_REQUIRED');
  if (d.type === 'PROPERTY') return { where: { refs: [d.id] }, byRef: true };
  if (d.type === 'AREA') return { where: { cityId: d.cityId, areaId: d.id }, byRef: false };
  return { where: { cityId: d.id }, byRef: false };
}

/**
 * Price every option of one property for the caller; options that can't be sold for this caller are left out.
 * @param {SearchDeps} deps
 * @param {{ caller: SearchCaller, p: SearchProperty, offers: Awaited<ReturnType<SearchDeps['availability']>>[number]['offers'], terms: Awaited<ReturnType<SearchDeps['planTerms']>>, q: SearchQuery, gst: boolean }} a
 */
export async function priceOptions(deps, { caller, p, offers, terms, q, gst }) {
  if (!p.stateCode) return [];
  const names = new Map(p.roomTypes.map((r) => [r.id, r.name]));
  const ctx = {
    channel: caller.channel,
    clientOrgId: caller.clientOrgId,
    clientCategory: caller.clientCategory,
    hotelOrgId: p.hotelOrgId,
    propertyId: p.id,
    cityId: p.cityId,
    starRating: p.starRating,
  };
  const out = [];
  for (const o of offers) {
    try {
      const b = await deps.quote({
        ctx,
        property: { stateCode: p.stateCode, gstRegistered: gst },
        checkIn: q.checkIn,
        checkOut: q.checkOut,
        nightly: o.nightly,
      });
      const t = terms.get(o.ratePlanId);
      out.push({
        roomTypeId: o.roomTypeId,
        roomTypeName: names.get(o.roomTypeId) ?? '',
        ratePlanId: o.ratePlanId,
        planName: t?.name ?? '',
        mealPlanKey: o.mealPlanKey,
        refundable: t?.refundable ?? false,
        available: o.available,
        totalPaise: b.totals.totalPaise,
        breakdown: b,
      });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error; // not sellable for this caller (no rule, no GST rate…) → left out
    }
  }
  return out;
}

/**
 * Availability for all candidates in one call, then each property's options priced for the caller.
 * @param {SearchDeps} deps
 * @param {(orgId: string) => Promise<boolean>} gstOf
 * @param {{ caller: SearchCaller, q: SearchQuery, candidates: SearchProperty[] }} a
 */
async function hitsFor(deps, gstOf, { caller, q, candidates }) {
  const groups = q.rooms.map((r) => ({ adults: r.adults, children: r.childrenAges.length }));
  const found = candidates.length
    ? await deps.availability({
        properties: candidates.map((p) => ({ id: p.id, timeZone: p.timeZone, roomTypes: p.roomTypes })),
        checkIn: q.checkIn,
        checkOut: q.checkOut,
        groups,
      })
    : [];
  const offersOf = new Map(found.map((f) => [f.propertyId, f.offers]));
  const terms = await deps.planTerms(found.flatMap((f) => f.offers.map((o) => o.ratePlanId)));
  const hits = await Promise.all(
    candidates.map(async (p) => {
      const offers = offersOf.get(p.id) ?? [];
      const options = offers.length ? await priceOptions(deps, { caller, p, offers, terms, q, gst: await gstOf(p.hotelOrgId) }) : [];
      const { id, publicRef, slug, name, starRating, cityName, areaName, location, distanceKm, coverUrl, amenities } = p;
      return {
        property: { id, publicRef, slug, name, starRating, cityName, areaName, location, distanceKm, coverUrl, amenities },
        options,
      };
    }),
  );
  return hits;
}

/** @param {SearchDeps} deps */
export function createSearchService(deps) {
  /** @type {ReturnType<typeof createCache<boolean>>} */
  const gstCache = createCache({ max: 5000, ttlMs: 5 * 60_000, clock: deps.clock });
  /** @param {string} orgId */
  async function gstOf(orgId) {
    const hit = gstCache.get(orgId);
    if (hit !== undefined) return hit;
    const v = await deps.gstRegistered(orgId);
    gstCache.set(orgId, v);
    return v;
  }

  return {
    gstOf,
    /** @param {SearchCaller} caller @param {SearchQuery} q */
    async search(caller, q) {
      const { where, byRef } = whereOf(q);
      const nights = stayNights(q.checkIn, q.checkOut, MAX_STAY_NIGHTS).length; // 1–30 nights, real dates — before any database read
      // `cursor: undefined` is dropped by JSON, so the fingerprint never depends on key order
      const query = queryKey({ ...q, cursor: undefined, channel: caller.channel, client: caller.clientOrgId });
      const offset = decodeCursor(q.cursor, query);
      const candidates = (await deps.candidates({ channel: caller.catalogChannel, clientCategory: caller.clientCategory, where })).filter(
        (p) => p.roomTypes.length > 0 || byRef,
      );
      const hits = await hitsFor(deps, gstOf, { caller, q, candidates });
      const limit = Math.min(q.limit ?? DEFAULT_PAGE, 50);
      const ranked = rankResults(hits, {
        filters: q.filters ?? {},
        sort: q.sort ?? (q.near ? 'distance' : 'recommended'),
        nights,
        byRef,
        limit,
        offset,
        query,
      });
      return {
        ...ranked,
        checkIn: q.checkIn,
        checkOut: q.checkOut,
        nights,
        rooms: q.rooms.length,
        channel: caller.channel,
        currency: 'INR',
      };
    },
  };
}
