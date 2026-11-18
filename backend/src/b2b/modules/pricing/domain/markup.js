// @ts-check
/**
 * A B2B client's own markup for its customers (plan Stage 05 §3.3). Pure. **Display only** — the "my selling
 * price" on the client's screens and branded vouchers. MusafirBaba never charges it and it never reaches a quote,
 * a token, an invoice or the ledger.
 * One default adjustment plus up to 20 overrides by city, property or star rating; the most specific override that
 * matches wins (property > city > stars, then list order). Fixed per night or percent of the client's price per
 * room-night (with optional min / max), or fixed per booking. Never negative.
 */
import { marginAmount } from './margin.js';

export const MARKUP_TYPES = /** @type {const} */ (['FIXED_PER_NIGHT', 'PERCENT', 'FIXED_PER_BOOKING']);
export const MAX_MARKUP_OVERRIDES = 20;
const MAX_FIXED = 10_000_000;
const MAX_BPS = 50_000;

/**
 * @typedef {{ type: typeof MARKUP_TYPES[number], value: number, minPaise?: number | null, maxPaise?: number | null }} MarkupAdjustment
 * @typedef {{ cityId?: string, propertyId?: string, starRating?: number }} MarkupMatch
 * @typedef {{ enabled: boolean, adjustment: MarkupAdjustment, overrides: { match: MarkupMatch, adjustment: MarkupAdjustment }[] }} Markup
 * @typedef {{ cityId?: string | null, propertyId: string, starRating?: number | null }} MarkupTarget
 */

/** @param {MarkupAdjustment} a @param {string} field */
function adjustmentProblems(a, field) {
  const out = [];
  const limit = a.type === 'PERCENT' ? MAX_BPS : MAX_FIXED;
  if (!Number.isSafeInteger(a.value) || a.value < 0 || a.value > limit) out.push({ code: 'VALUE_INVALID', field: `${field}.value` });
  const bounds = [a.minPaise, a.maxPaise].filter((x) => x !== undefined && x !== null);
  if (bounds.length > 0 && a.type !== 'PERCENT') out.push({ code: 'BOUNDS_ONLY_FOR_PERCENT', field });
  if (bounds.some((x) => !Number.isSafeInteger(x) || /** @type {number} */ (x) < 0 || /** @type {number} */ (x) > MAX_FIXED))
    out.push({ code: 'VALUE_INVALID', field: `${field}.maxPaise` });
  if (typeof a.minPaise === 'number' && typeof a.maxPaise === 'number' && a.maxPaise < a.minPaise)
    out.push({ code: 'BOUNDS_RANGE', field });
  return out;
}

/** Every problem at once (MARKUP_INVALID). @param {Markup} m */
export function markupProblems(m) {
  const out = adjustmentProblems(m.adjustment, 'adjustment');
  if (m.overrides.length > MAX_MARKUP_OVERRIDES) out.push({ code: 'TOO_MANY_OVERRIDES', field: 'overrides' });
  m.overrides.forEach((o, i) => {
    if (!o.match.cityId && !o.match.propertyId && o.match.starRating === undefined)
      out.push({ code: 'MATCH_EMPTY', field: `overrides.${i}.match` });
    out.push(...adjustmentProblems(o.adjustment, `overrides.${i}.adjustment`));
  });
  return out;
}

/** @param {MarkupMatch} m */
const weight = (m) => (m.propertyId ? 4 : 0) + (m.cityId ? 2 : 0) + (m.starRating !== undefined ? 1 : 0);

/**
 * The adjustment that applies to a property.
 * @param {Markup} m
 * @param {MarkupTarget} t
 */
export function markupFor(m, t) {
  const hits = m.overrides.filter(
    (o) =>
      (!o.match.propertyId || o.match.propertyId === t.propertyId) &&
      (!o.match.cityId || o.match.cityId === t.cityId) &&
      (o.match.starRating === undefined || o.match.starRating === t.starRating),
  );
  const best = hits.reduce(
    (top, o) => (top === null || weight(o.match) > weight(top.match) ? o : top),
    /** @type {typeof hits[number] | null} */ (null),
  );
  return best ? best.adjustment : m.adjustment;
}

/**
 * The client's selling price for a quote it sees (price + GST lines per room-night, no hotel rate).
 * @param {Markup | null} m
 * @param {MarkupTarget} t
 * @param {{ totalPaise: number, nightly: { sellPaise: number }[] }} clientPrice
 * @returns {{ markupPaise: number, sellingPricePaise: number }}
 */
export function sellingPrice(m, t, clientPrice) {
  if (!m || !m.enabled) return { markupPaise: 0, sellingPricePaise: clientPrice.totalPaise };
  const a = markupFor(m, t);
  const markupPaise =
    a.type === 'FIXED_PER_BOOKING' ? a.value : clientPrice.nightly.reduce((sum, n) => sum + Math.max(0, marginAmount(a, n.sellPaise)), 0);
  return { markupPaise, sellingPricePaise: clientPrice.totalPaise + markupPaise };
}
