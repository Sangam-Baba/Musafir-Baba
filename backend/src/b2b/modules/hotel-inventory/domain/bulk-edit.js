// @ts-check
/**
 * Bulk calendar edits (plan Stage 04 §3.5–3.6): which nights a change covers (range + weekdays; past nights and
 * nights beyond the window are skipped), checks for each price / rule change, and the "big price change" warning
 * (> 50 % up or down) that must be confirmed. Pure.
 */
import { priceKeys } from './rate-day.js';

export const MAX_EDIT_NIGHTS = 366;
export const MAX_EDIT_CELLS = 20_000;
export const BIG_CHANGE_RATIO = 0.5;
export const RULE_FIELDS = /** @type {const} */ (['minLos', 'maxLos', 'closedToArrival', 'closedToDeparture', 'stopSell']);

/**
 * @typedef {{ ratePlanId: string, roomTypeId: string, prices?: { guests: number, amount: number | null }[],
 *   minLos?: number | null, maxLos?: number | null, closedToArrival?: boolean, closedToDeparture?: boolean, stopSell?: boolean }} RateChange
 * @typedef {{ roomTypeId: string, total?: number, stopSell?: boolean }} RoomChange
 */

/**
 * @param {string[]} all  every night of the range
 * @param {{ weekdays: number[] | null, today: string, windowEnd: string, weekdayOf: (d: string) => number }} o
 */
export function selectDates(all, o) {
  const wanted = o.weekdays ? all.filter((d) => /** @type {number[]} */ (o.weekdays).includes(o.weekdayOf(d))) : all;
  return {
    dates: wanted.filter((d) => d >= o.today && d <= o.windowEnd),
    past: wanted.filter((d) => d < o.today),
    beyondWindow: wanted.filter((d) => d > o.windowEnd),
  };
}

/**
 * @param {{ guests: number }[]} prices
 * @param {{ pricingModel: string, derived: unknown }} plan
 * @param {{ maxOccupancy: number }} roomType
 * @returns {string[]}
 */
function priceProblems(prices, plan, roomType) {
  if (prices.length === 0) return [];
  /** @type {string[]} */
  const problems = [];
  const keys = priceKeys(plan, roomType);
  if (plan.derived) problems.push('PRICES_COME_FROM_PARENT');
  else if (prices.some((p) => !keys.includes(p.guests))) problems.push('PRICE_GUESTS_INVALID');
  if (new Set(prices.map((p) => p.guests)).size !== prices.length) problems.push('PRICE_GUESTS_REPEATED');
  return problems;
}

/**
 * Problems with one price / rule change (empty = fine).
 * @param {RateChange} c
 * @param {{ roomTypeIds: string[], pricingModel: string, derived: unknown } | undefined} plan
 * @param {{ maxOccupancy: number } | undefined} roomType
 * @returns {string[]}
 */
export function rateChangeProblems(c, plan, roomType) {
  if (!plan) return ['RATE_PLAN_UNKNOWN'];
  if (!roomType || !plan.roomTypeIds.includes(c.roomTypeId)) return ['ROOM_TYPE_NOT_IN_PLAN'];
  const problems = priceProblems(c.prices ?? [], plan, roomType);
  if (typeof c.minLos === 'number' && typeof c.maxLos === 'number' && c.minLos > c.maxLos) problems.push('STAY_LIMITS_ORDER');
  const changes = ['prices', ...RULE_FIELDS].filter((k) => /** @type {Record<string, unknown>} */ (c)[k] !== undefined);
  if (changes.length === 0 || (changes.length === 1 && c.prices?.length === 0)) problems.push('NOTHING_TO_CHANGE');
  return problems;
}

/**
 * Prices that move more than 50 % up or down.
 * @param {{ guests: number, amount: number }[]} current @param {{ guests: number, amount: number | null }[]} next
 * @returns {{ guests: number, from: number, to: number }[]}
 */
export function bigChanges(current, next) {
  return next.flatMap((n) => {
    const old = current.find((c) => c.guests === n.guests)?.amount;
    if (!old || n.amount === null) return [];
    return Math.abs(n.amount - old) / old > BIG_CHANGE_RATIO ? [{ guests: n.guests, from: old, to: n.amount }] : [];
  });
}

/**
 * The stored prices after a change: given guests replaced (null amount = price removed), others kept.
 * @param {{ guests: number, amount: number }[]} current @param {{ guests: number, amount: number | null }[]} change
 */
export function mergedPrices(current, change) {
  const touched = new Set(change.map((c) => c.guests));
  const kept = current.filter((c) => !touched.has(c.guests));
  const added = change.filter((c) => c.amount !== null).map((c) => ({ guests: c.guests, amount: /** @type {number} */ (c.amount) }));
  return [...kept, ...added].sort((a, b) => a.guests - b.guests);
}
