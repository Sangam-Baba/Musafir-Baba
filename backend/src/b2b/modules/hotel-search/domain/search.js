// @ts-check
/**
 * Search results (plan Stage 06 §3.2, §5). Pure. Each property comes with its priced options (room type × plan,
 * total for the stay and rooms asked, incl. GST, for the caller's channel). Filters apply to the options (meal
 * plans, refundable) and to the property (stars, amenities); the cheapest remaining option is the "from" price,
 * and the price range is checked on its price per night. Properties left without an option drop out — unless they
 * were asked for by reference, then they show as sold out. Sort: recommended (stars, then price), price, stars,
 * distance. Paging by an opaque cursor tied to the query.
 */
import { createHash } from 'node:crypto';

import { DomainError } from '../../../core/errors.js';

export const DEFAULT_PAGE = 20;
export const MAX_PAGE = 50;
export const SORTS = /** @type {const} */ (['recommended', 'price', 'star', 'distance']);

/**
 * @typedef {{ roomTypeId: string, roomTypeName: string, ratePlanId: string, planName: string, mealPlanKey: string,
 *   refundable: boolean, available: number, totalPaise: number, sellingPricePaise?: number }} PricedOption
 *   (`sellingPricePaise`: a B2B client's own markup on top — display only, never charged)
 * @typedef {{ star?: number[], priceRange?: { minPaise?: number, maxPaise?: number }, mealPlans?: string[],
 *   refundableOnly?: boolean, amenities?: string[] }} Filters
 * @typedef {{ id: string, publicRef: string, slug: string, name: string, starRating: number, cityName: string | null,
 *   areaName: string | null, location: { lat: number, lng: number } | null, distanceKm: number | null,
 *   coverUrl: string | null, amenities: string[] }} HitProperty
 * @typedef {{ property: HitProperty, options: PricedOption[] }} Hit
 */

/**
 * @param {Hit} hit
 * @param {Filters} f
 */
function cheapest(hit, f) {
  const ok = hit.options.filter(
    (o) => (!f.mealPlans?.length || f.mealPlans.includes(o.mealPlanKey)) && (!f.refundableOnly || o.refundable),
  );
  return ok.reduce((best, o) => (best === null || o.totalPaise < best.totalPaise ? o : best), /** @type {PricedOption | null} */ (null));
}

/**
 * @param {HitProperty} p
 * @param {Filters} f
 */
const propertyPasses = (p, f) =>
  (!f.star?.length || f.star.includes(p.starRating)) && (f.amenities ?? []).every((a) => p.amenities.includes(a));

/** @param {string} query @param {number} offset */
export const encodeCursor = (query, offset) => Buffer.from(JSON.stringify({ o: offset, q: query })).toString('base64url');

/** @param {string | null | undefined} cursor @param {string} query */
export function decodeCursor(cursor, query) {
  if (!cursor) return 0;
  try {
    const c = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (c.q === query && Number.isSafeInteger(c.o) && c.o >= 0) return c.o;
  } catch {
    // fall through
  }
  throw new DomainError('CURSOR_INVALID');
}

/** A short fingerprint of the query, so a cursor can't be replayed against another search. @param {unknown} q */
export const queryKey = (q) => createHash('sha256').update(JSON.stringify(q)).digest('base64url').slice(0, 16);

/**
 * @param {Hit[]} hits
 * @param {{ filters: Filters, sort: typeof SORTS[number], nights: number, byRef: boolean, limit: number, offset: number, query: string }} q
 */
export function rankResults(hits, q) {
  const f = q.filters;
  const rows = hits
    .filter((h) => propertyPasses(h.property, f))
    .map((h) => ({ h, best: cheapest(h, f) }))
    .filter(({ best }) => {
      if (!best) return q.byRef;
      const perNight = Math.round(best.totalPaise / q.nights);
      return (
        (f.priceRange?.minPaise === undefined || perNight >= f.priceRange.minPaise) &&
        (f.priceRange?.maxPaise === undefined || perNight <= f.priceRange.maxPaise)
      );
    });
  const price = (/** @type {{ best: PricedOption | null }} */ r) => r.best?.totalPaise ?? Number.MAX_SAFE_INTEGER;
  const byName = (/** @type {{ h: Hit }} */ a, /** @type {{ h: Hit }} */ b) => a.h.property.name.localeCompare(b.h.property.name);
  /** @type {Record<typeof SORTS[number], (a: typeof rows[number], b: typeof rows[number]) => number>} */
  const order = {
    recommended: (a, b) =>
      Number(!a.best) - Number(!b.best) || b.h.property.starRating - a.h.property.starRating || price(a) - price(b) || byName(a, b),
    price: (a, b) => price(a) - price(b) || byName(a, b),
    star: (a, b) => b.h.property.starRating - a.h.property.starRating || price(a) - price(b) || byName(a, b),
    distance: (a, b) =>
      (a.h.property.distanceKm ?? Infinity) - (b.h.property.distanceKm ?? Infinity) || price(a) - price(b) || byName(a, b),
  };
  rows.sort(order[q.sort]);
  const page = rows.slice(q.offset, q.offset + q.limit);
  return {
    total: rows.length,
    items: page.map(({ h, best }) => ({
      ...h.property,
      soldOut: !best,
      from: best
        ? {
            totalPaise: best.totalPaise,
            perNightPaise: Math.round(best.totalPaise / q.nights),
            gstIncluded: true,
            roomTypeName: best.roomTypeName,
            planName: best.planName,
            mealPlanKey: best.mealPlanKey,
            refundable: best.refundable,
            ...(best.sellingPricePaise === undefined
              ? {}
              : { sellingPricePaise: best.sellingPricePaise, sellingPerNightPaise: Math.round(best.sellingPricePaise / q.nights) }),
          }
        : null,
    })),
    nextCursor: q.offset + q.limit < rows.length ? encodeCursor(q.query, q.offset + q.limit) : null,
  };
}
