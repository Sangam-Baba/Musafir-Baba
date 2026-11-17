// @ts-check
/**
 * `hotel-inventory.inventory.changed` (plan Stage 04 §6): which property, room types and nights changed. Stored in
 * the document whose change caused it (hold, change log entry) in the same update (`05-…` §7a) and relayed by the
 * worker — so the event exists if and only if the change happened. Ids and dates only.
 */
import { newEvent } from '../../core/db/events.js';
import { addDays } from './domain/dates.js';
import { EVENTS } from './events.js';

/**
 * @param {{ orgId: string, propertyId: string, roomTypeIds: string[], dates: string[] }} c
 * @param {Date} now
 */
export function inventoryChangedEvent(c, now) {
  const dates = [...c.dates].sort();
  const first = dates[0] ?? '';
  const last = dates[dates.length - 1] ?? first;
  return newEvent(
    EVENTS.inventoryChanged,
    {
      orgId: c.orgId,
      propertyId: c.propertyId,
      roomTypeIds: [...new Set(c.roomTypeIds)].sort(),
      dateFrom: first,
      dateTo: last ? addDays(last, 1) : first,
    },
    { clock: { now: () => now } },
  );
}

/** The event for a hold's nights. @param {any} hold @param {Date} now */
export const holdChangedEvent = (hold, now) =>
  inventoryChangedEvent(
    {
      orgId: hold.hotelOrgId,
      propertyId: hold.propertyId,
      roomTypeIds: hold.lines.map((/** @type {any} */ l) => l.roomTypeId),
      dates: hold.lines.flatMap((/** @type {any} */ l) => l.dates),
    },
    now,
  );
