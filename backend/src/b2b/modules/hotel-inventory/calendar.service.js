// @ts-check
/**
 * Reading a property's calendar (plan Stage 04 §3.5, §5): `GET /hotel/properties/:id/calendar?from&to`
 * (≤ 92 nights). Through the property first (same limits). Opening the calendar creates the missing nights
 * of the window (0 rooms) for the property's active room types — so the hotel can start setting rooms.
 */
import { DEFAULT_TIME_ZONE } from '../hotel-catalog/index.js';
import { buildCalendar } from './domain/calendar.js';
import { addDays, CALENDAR_WINDOW_DAYS, nights, todayIn } from './domain/dates.js';
import { ensureNights } from './inventory-days.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';
import { RateDayRecord } from './models/rate-day.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';
import { PERMISSIONS } from './permissions.js';
import { ratePlanDto } from './rate-plan.service.js';

export const MAX_CALENDAR_NIGHTS = 92;

/** @typedef {import('../../core/context.js').RequestContext} Ctx */
/** @typedef {import('./domain/calendar.js').RoomTypeLite} RoomTypeLite */
/**
 * @typedef {{ properties: { loadOwned: (ctx: Ctx, id: string, permission: string) => Promise<any> },
 *   roomTypesOf: (ctx: Ctx, propertyId: string) => Promise<RoomTypeLite[]>, clock: import('../../core/clock.js').Clock }} CalendarDeps
 */

/** @param {CalendarDeps} deps */
export function createCalendarService(deps) {
  return {
    /** @param {Ctx} ctx @param {string} propertyId @param {{ from: string, to: string }} range */
    async read(ctx, propertyId, range) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarRead);
      const dates = nights(range.from, range.to, MAX_CALENDAR_NIGHTS);
      const timeZone = p.timeZone || DEFAULT_TIME_ZONE;
      const today = todayIn(timeZone, deps.clock.now());
      const windowEnd = addDays(today, CALENDAR_WINDOW_DAYS);
      const roomTypes = await deps.roomTypesOf(ctx, propertyId);
      const open = dates.filter((d) => d >= today && d <= windowEnd);
      await ensureNights({ hotelOrgId: p.hotelOrgId, propertyId, roomTypeIds: roomTypes.map((r) => r.id), dates: open });
      const between = { $gte: range.from, $lt: range.to };
      const [nightDocs, plans, rateDays] = await Promise.all([
        InventoryDayRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, date: between }).lean(),
        RatePlanRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: { $in: ['ACTIVE', 'INACTIVE'] } })
          .sort({ order: 1, name: 1 })
          .lean(),
        RateDayRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, date: between }).lean(),
      ]);
      return {
        property: { id: propertyId, name: p.name, timeZone },
        ...buildCalendar({ dates, today, windowEnd, roomTypes, plans: plans.map(ratePlanDto), nights: nightDocs, rateDays }),
      };
    },
  };
}
