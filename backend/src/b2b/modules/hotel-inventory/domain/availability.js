// @ts-check
/**
 * What can be sold for a stay (plan Stage 04 §3.8, §7; `05-…` §4). Pure. For each room type × rate plan:
 * - every guest group fits the room type (adults, children, total);
 * - every night [checkIn, checkOut) exists, isn't stopped and has enough rooms free (total − booked − held);
 * - the plan is active, sells that room type, and the stay starts inside its booking window (days ahead,
 *   counted from the property's own date); no past check-in;
 * - no night of the plan is stopped; the arrival night allows arrival and sets the min / max stay; the
 *   check-out date allows departure;
 * - every night has a price for every room's number of guests (per-room plans: one price).
 * The result is advisory (search); the booking step re-checks with the conditional update (`05-…` §5).
 */
import { daysBetween } from './dates.js';
import { effectiveDay, priceFor } from './rate-day.js';

export const MAX_ROOMS_PER_STAY = 9;

/** @typedef {{ adults: number, children: number }} GuestGroup */
/** @typedef {{ id: string, maxAdults: number, maxChildren: number, maxOccupancy: number }} RoomTypeFacts */
/** @typedef {import('./rate-day.js').DayRules} DayRules */
/**
 * @typedef {{ roomTypeId: string, ratePlanId: string, mealPlanKey: string, available: number,
 *   nightly: { date: string, amounts: number[] }[], totalNet: number }} Offer
 */

/** @param {RoomTypeFacts} rt @param {GuestGroup} g */
export const fits = (rt, g) =>
  g.adults >= 1 && g.adults <= rt.maxAdults && g.children <= rt.maxChildren && g.adults + g.children <= rt.maxOccupancy;

/**
 * Rooms free on every night, or null when a night is missing / stopped.
 * @param {string[]} stay @param {(date: string) => any} nightOf
 */
function freeRooms(stay, nightOf) {
  let min = Infinity;
  for (const date of stay) {
    const n = nightOf(date);
    if (!n || n.stopSell) return null;
    min = Math.min(min, n.total - n.booked - n.held);
  }
  return min;
}

/** @param {any} plan @param {DayRules[]} days @param {DayRules} departure @param {number} count */
function rulesAllow(plan, days, departure, count) {
  const arrival = days[0];
  if (!arrival || days.some((d) => d.stopSell)) return false;
  if (arrival.closedToArrival || departure.closedToDeparture) return false;
  if (arrival.minLos !== null && count < arrival.minLos) return false;
  if (arrival.maxLos !== null && count > arrival.maxLos) return false;
  return Boolean(plan);
}

/**
 * @param {{ stay: string[], checkOut: string, today: string, groups: GuestGroup[], roomTypes: RoomTypeFacts[], plans: any[],
 *   nightOf: (roomTypeId: string, date: string) => any, storedDay: (ratePlanId: string, roomTypeId: string, date: string) => DayRules | null }} a
 * @returns {Offer[]}
 */
export function evaluate(a) {
  const firstNight = a.stay[0];
  if (!firstNight || firstNight < a.today) return [];
  const ahead = daysBetween(a.today, firstNight);
  /** @type {Offer[]} */
  const offers = [];
  for (const rt of a.roomTypes) {
    if (!a.groups.every((g) => fits(rt, g))) continue;
    const available = freeRooms(a.stay, (d) => a.nightOf(rt.id, d));
    if (available === null || available < a.groups.length) continue;
    for (const plan of a.plans) {
      if (plan.status !== 'ACTIVE' || !plan.roomTypeIds.includes(rt.id)) continue;
      if (ahead < plan.minAdvanceDays || ahead > plan.maxAdvanceDays) continue;
      const day = (/** @type {string} */ d) =>
        effectiveDay(plan, a.storedDay(plan.id, rt.id, d), plan.derived ? a.storedDay(plan.derived.parentRatePlanId, rt.id, d) : null);
      const days = a.stay.map(day);
      if (!rulesAllow(plan, days, day(a.checkOut), a.stay.length)) continue;
      const nightly = a.stay.map((date, i) => ({
        date,
        amounts: a.groups.map((g) => priceFor(/** @type {DayRules} */ (days[i]), plan, g.adults + g.children)),
      }));
      if (nightly.some((n) => n.amounts.some((x) => x === null))) continue;
      const priced = /** @type {{ date: string, amounts: number[] }[]} */ (nightly);
      const totalNet = priced.reduce((sum, n) => sum + n.amounts.reduce((s, x) => s + x, 0), 0);
      offers.push({ roomTypeId: rt.id, ratePlanId: plan.id, mealPlanKey: plan.mealPlanKey, available, nightly: priced, totalNet });
    }
  }
  return offers;
}
