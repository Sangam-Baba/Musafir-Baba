// @ts-check
/**
 * Prices and rules per night (plan Stage 04 §3.4). Prices are tax-exclusive, integer paise:
 * - per-room plans have one price (`guests: 0`);
 * - per-occupancy plans have a price for each number of guests, 1 … the room type's maximum.
 * Rules: minimum / maximum stay (checked on the arrival night), closed to arrival (that night can't be the
 * check-in), closed to departure (that date can't be the check-out), stop-sell.
 * A derived plan's prices come from its parent at reading time (so it can never drift from it); for its rules
 * the stricter of its own and its parent's applies. A missing price = not sellable for stays covering that night.
 */
import { derivedPrice } from './rate-plan.js';

export const MAX_STAY_NIGHTS = 30;

/** @typedef {{ guests: number, amount: number }} Price */
/**
 * @typedef {{ prices: Price[], minLos: number | null, maxLos: number | null, closedToArrival: boolean,
 *   closedToDeparture: boolean, stopSell: boolean }} DayRules
 */

/** @type {DayRules} */
export const EMPTY_DAY = { prices: [], minLos: null, maxLos: null, closedToArrival: false, closedToDeparture: false, stopSell: false };

/** The price keys a plan needs for a room type. @param {{ pricingModel: string }} plan @param {{ maxOccupancy: number }} roomType */
export function priceKeys(plan, roomType) {
  if (plan.pricingModel === 'PER_ROOM') return [0];
  return Array.from({ length: roomType.maxOccupancy }, (_, i) => i + 1);
}

/** @param {number | null} a @param {number | null} b @param {(x: number, y: number) => number} pick */
const stricter = (a, b, pick) => (a === null ? b : b === null ? a : pick(a, b));

/**
 * The night as guests see it.
 * @param {{ derived: { adjust: import('./rate-plan.js').Adjust } | null }} plan
 * @param {DayRules | null} own  this plan's stored night (null if none)
 * @param {DayRules | null} parent  the parent plan's stored night (derived plans only)
 * @returns {DayRules}
 */
export function effectiveDay(plan, own, parent) {
  const mine = own ?? EMPTY_DAY;
  if (!plan.derived) return { ...EMPTY_DAY, ...mine };
  const base = parent ?? EMPTY_DAY;
  const adjust = plan.derived.adjust;
  return {
    prices: base.prices.map((p) => ({ guests: p.guests, amount: /** @type {number} */ (derivedPrice(p.amount, adjust)) })),
    minLos: stricter(mine.minLos, base.minLos, Math.max),
    maxLos: stricter(mine.maxLos, base.maxLos, Math.min),
    closedToArrival: mine.closedToArrival || base.closedToArrival,
    closedToDeparture: mine.closedToDeparture || base.closedToDeparture,
    stopSell: mine.stopSell || base.stopSell,
  };
}

/** The price for a number of guests on a night, or null. @param {DayRules} day @param {{ pricingModel: string }} plan @param {number} guests */
export function priceFor(day, plan, guests) {
  const key = plan.pricingModel === 'PER_ROOM' ? 0 : guests;
  return day.prices.find((p) => p.guests === key)?.amount ?? null;
}
