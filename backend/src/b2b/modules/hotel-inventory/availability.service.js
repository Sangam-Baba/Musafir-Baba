// @ts-check
/**
 * `checkAvailability` (plan Stage 04 §3.8, §5 — internal, no HTTP): for candidate properties and a stay, the
 * sellable room type × rate plan offers with nightly tax-exclusive prices and the rooms free. Reads across hotels
 * (search), so it runs with a logged system scope. The caller (search, booking) passes each property's facts from
 * hotel-catalog (time zone, room types with their guest limits) — this module never reads catalogue data itself.
 * Step 1 is the aggregation of `05-…` §4 (only room types free on every night go further); step 2 the full rules.
 */
import { DomainError } from '../../core/errors.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { evaluate, MAX_ROOMS_PER_STAY } from './domain/availability.js';
import { nights, todayIn } from './domain/dates.js';
import { MAX_STAY_NIGHTS } from './domain/rate-day.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';
import { RateDayRecord } from './models/rate-day.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';
import { ratePlanDto } from './rate-plan.service.js';

const SCOPE = systemScope('hotel-inventory: availability for a stay (search / booking)', { routine: true });

/** @typedef {import('./domain/availability.js').GuestGroup} GuestGroup */
/** @typedef {import('./domain/availability.js').RoomTypeFacts} RoomTypeFacts */
/** @typedef {{ id: string, timeZone: string, roomTypes: RoomTypeFacts[] }} PropertyFacts */

/** Room types free (not stopped, enough rooms) on every night — the aggregation of `05-…` §4. @param {string[]} ids @param {string[]} stay @param {number} rooms */
async function freeRoomTypes(ids, stay, rooms) {
  const rows = await InventoryDayRecord.aggregate([
    { $match: { propertyId: { $in: ids }, date: { $in: stay }, stopSell: false } },
    { $project: { roomTypeId: 1, available: { $subtract: ['$total', { $add: ['$booked', '$held'] }] } } },
    { $group: { _id: '$roomTypeId', nights: { $sum: 1 }, minAvailable: { $min: '$available' } } },
    { $match: { nights: stay.length, minAvailable: { $gte: rooms } } },
  ]).option(SCOPE);
  return rows.map((r) => String(r._id));
}

/** @param {any[]} docs @param {(d: any) => string} key */
const indexBy = (docs, key) => new Map(docs.map((d) => [key(d), d]));

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createAvailabilityService(deps) {
  return {
    /**
     * @param {{ properties: PropertyFacts[], checkIn: string, checkOut: string, groups: GuestGroup[] }} q
     * @returns {Promise<{ propertyId: string, offers: import('./domain/availability.js').Offer[] }[]>}
     */
    async checkAvailability(q) {
      if (q.groups.length < 1 || q.groups.length > MAX_ROOMS_PER_STAY)
        throw new DomainError('ROOMS_OUT_OF_RANGE', { max: MAX_ROOMS_PER_STAY });
      const stay = nights(q.checkIn, q.checkOut, MAX_STAY_NIGHTS);
      const ids = q.properties.map((p) => p.id);
      if (ids.length === 0) return [];
      const candidates = new Set(await freeRoomTypes(ids, stay, q.groups.length));
      if (candidates.size === 0) return q.properties.map((p) => ({ propertyId: p.id, offers: [] }));
      const [nightDocs, planDocs] = await Promise.all([
        InventoryDayRecord.find({ propertyId: { $in: ids }, roomTypeId: { $in: [...candidates] }, date: { $in: stay } })
          .setOptions(SCOPE)
          .lean(),
        RatePlanRecord.find({ propertyId: { $in: ids }, status: 'ACTIVE', roomTypeIds: { $in: [...candidates] } })
          .setOptions(SCOPE)
          .lean(),
      ]);
      const plans = planDocs.map(ratePlanDto);
      const planIds = [...new Set(plans.flatMap((p) => (p.derived ? [p.id, p.derived.parentRatePlanId] : [p.id])))];
      const rateDocs = await RateDayRecord.find({
        propertyId: { $in: ids },
        ratePlanId: { $in: planIds },
        date: { $gte: q.checkIn, $lte: q.checkOut },
      })
        .setOptions(SCOPE)
        .lean();
      const night = indexBy(nightDocs, (n) => `${n.roomTypeId}|${n.date}`);
      const rate = indexBy(rateDocs, (r) => `${r.ratePlanId}|${r.roomTypeId}|${r.date}`);
      return q.properties.map((p) => ({
        propertyId: p.id,
        offers: evaluate({
          stay,
          checkOut: q.checkOut,
          today: todayIn(p.timeZone, deps.clock.now()),
          groups: q.groups,
          roomTypes: p.roomTypes.filter((rt) => candidates.has(rt.id)),
          plans: plans.filter((pl) => pl.propertyId === p.id),
          nightOf: (rt, d) => night.get(`${rt}|${d}`) ?? null,
          storedDay: (pl, rt, d) => rate.get(`${pl}|${rt}|${d}`) ?? null,
        }),
      }));
    },
  };
}
