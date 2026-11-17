// @ts-check
/**
 * The calendar grid (plan Stage 04 §3.5): per room type its rooms per night, and per rate plan selling that
 * room type its prices and rules per night (derived plans worked out from their parent). Pure. Past nights
 * (the property's own date) and nights beyond the 365-day window are read-only.
 */
import { effectiveDay, priceKeys } from './rate-day.js';

/** @typedef {{ id: string, name: string, maxOccupancy: number }} RoomTypeLite */
/** @typedef {import('./rate-day.js').DayRules} DayRules */

/** @param {any} d @returns {DayRules} */
const rulesOf = (d) => ({
  prices: (d.prices ?? []).map((/** @type {any} */ p) => ({ guests: p.guests, amount: p.amount })),
  minLos: d.minLos ?? null,
  maxLos: d.maxLos ?? null,
  closedToArrival: Boolean(d.closedToArrival),
  closedToDeparture: Boolean(d.closedToDeparture),
  stopSell: Boolean(d.stopSell),
});

/**
 * @param {{ dates: string[], today: string, windowEnd: string, roomTypes: RoomTypeLite[], plans: any[], nights: any[], rateDays: any[] }} a
 */
export function buildCalendar({ dates, today, windowEnd, roomTypes, plans, nights, rateDays }) {
  const editable = (/** @type {string} */ d) => d >= today && d <= windowEnd;
  const night = new Map(nights.map((n) => [`${n.roomTypeId}|${n.date}`, n]));
  const rate = new Map(rateDays.map((r) => [`${r.ratePlanId}|${r.roomTypeId}|${r.date}`, rulesOf(r)]));
  return {
    dates,
    today,
    roomTypes: roomTypes.map((rt) => ({
      id: rt.id,
      name: rt.name,
      maxOccupancy: rt.maxOccupancy,
      nights: dates.map((date) => {
        const n = night.get(`${rt.id}|${date}`);
        const total = n?.total ?? 0;
        const booked = n?.booked ?? 0;
        const held = n?.held ?? 0;
        return { date, total, booked, held, available: total - booked - held, stopSell: Boolean(n?.stopSell), editable: editable(date) };
      }),
      ratePlans: plans
        .filter((p) => p.roomTypeIds.includes(rt.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          mealPlanKey: p.mealPlanKey,
          pricingModel: p.pricingModel,
          status: p.status,
          derived: p.derived,
          priceKeys: priceKeys(p, rt),
          days: dates.map((date) => {
            const own = rate.get(`${p.id}|${rt.id}|${date}`) ?? null;
            const parent = p.derived ? (rate.get(`${p.derived.parentRatePlanId}|${rt.id}|${date}`) ?? null) : null;
            return { date, ...effectiveDay(p, own, parent), editable: editable(date) };
          }),
        })),
    })),
  };
}
