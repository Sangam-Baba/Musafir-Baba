// @ts-check
/**
 * Creating nights (plan Stage 04 §3.3). A night is created with 0 rooms the first time the calendar needs it
 * (opened or edited) and kept 365 days ahead by a nightly job — only nights the module already knows a room type
 * for are extended, so nothing depends on hotel-catalog events. Creating is repeat-safe (`$setOnInsert` upserts
 * on the unique {roomTypeId, date} index; a race with another process is harmless). Existing nights are never
 * touched here, and nights are never deleted.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { addDays, CALENDAR_WINDOW_DAYS } from './domain/dates.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';

const MAX_ROOM_TYPES_PER_RUN = 500;

/** @param {unknown} error a bulk write whose only failures are "someone else created it first" */
const onlyDuplicates = (error) => {
  const e = /** @type {{ code?: number, writeErrors?: { code?: number }[] }} */ (error);
  return e.code === 11000 || (Array.isArray(e.writeErrors) && e.writeErrors.length > 0 && e.writeErrors.every((w) => w.code === 11000));
};

/**
 * Makes sure every (room type, night) exists. Returns how many were created.
 * @param {{ hotelOrgId: string, propertyId: string, roomTypeIds: string[], dates: string[] }} a
 */
export async function ensureNights({ hotelOrgId, propertyId, roomTypeIds, dates }) {
  if (roomTypeIds.length === 0 || dates.length === 0) return 0;
  const ops = roomTypeIds.flatMap((roomTypeId) =>
    dates.map((date) => ({
      updateOne: {
        filter: { hotelOrgId, roomTypeId, date },
        update: {
          $setOnInsert: {
            hotelOrgId,
            propertyId,
            roomTypeId,
            date,
            total: 0,
            booked: 0,
            held: 0,
            stopSell: false,
            holds: [],
            bookings: [],
            version: 1,
          },
        },
        upsert: true,
      },
    })),
  );
  try {
    return (await InventoryDayRecord.bulkWrite(ops, { ordered: false })).upsertedCount;
  } catch (error) {
    if (onlyDuplicates(error)) return /** @type {any} */ (error).result?.upsertedCount ?? 0;
    throw error;
  }
}

/**
 * Nightly: every room type whose last night is less than 365 days ahead gets the missing nights (0 rooms).
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @returns {Promise<{ roomTypes: number, created: number }>}
 */
export async function extendCalendarWindow(deps) {
  const scope = systemScope('hotel-inventory: keep the calendar 365 days ahead', { routine: true });
  // one day of margin for time zones ahead of UTC
  const until = addDays(deps.clock.now().toISOString().slice(0, 10), CALENDAR_WINDOW_DAYS + 1);
  // newest night per room type, answered from the {roomTypeId, date} index (no full scan)
  const ends = await InventoryDayRecord.aggregate([
    { $sort: { roomTypeId: 1, date: -1 } },
    { $group: { _id: '$roomTypeId', last: { $first: '$date' } } },
    { $match: { last: { $lt: until } } },
    { $limit: MAX_ROOM_TYPES_PER_RUN },
  ]).option(scope);
  let created = 0;
  for (const e of ends) {
    const owner = await InventoryDayRecord.findOne({ roomTypeId: e._id, date: e.last }, { hotelOrgId: 1, propertyId: 1 })
      .setOptions(scope)
      .lean();
    if (!owner) continue;
    const dates = [];
    for (let d = addDays(e.last, 1); d <= until; d = addDays(d, 1)) dates.push(d);
    created += await ensureNights({ hotelOrgId: owner.hotelOrgId, propertyId: owner.propertyId, roomTypeIds: [String(e._id)], dates });
  }
  return { roomTypes: ends.length, created };
}
