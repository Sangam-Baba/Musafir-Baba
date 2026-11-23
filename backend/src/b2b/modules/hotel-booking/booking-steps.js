// @ts-check
/** Booking steps shared by the engine and cancellations: load a booking, change its status with a history row (+ event). */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { transition } from '../../core/db/transition.js';
import { NotFoundError } from '../../core/errors.js';
import { BookingRecord } from './models/booking.model.js';
import { BookingStatusRecord } from './models/status-history.model.js';

export const ENGINE = systemScope('hotel-booking: booking engine', { routine: true });

/** @typedef {{ clock: import('../../core/clock.js').Clock }} StepDeps */

/** @param {string} id */
export async function loadBooking(id) {
  const b = /^[a-f0-9]{24}$/.test(id) ? await BookingRecord.findOne({ _id: id }).setOptions(ENGINE).lean() : null;
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/**
 * A status change with its history row (and event, when given).
 * @param {StepDeps} deps
 * @param {Record<string, any>} b
 * @param {{ from: string | string[], to: string, by: string, set?: Record<string, unknown>, event?: string, note?: string }} m
 */
export async function moveBooking(deps, b, m) {
  const events = m.event
    ? [
        newEvent(
          m.event,
          {
            orgId: b.hotelOrgId,
            bookingId: String(b._id),
            ref: b.ref,
            orderId: b.orderId,
            propertyId: b.propertyId,
            name: b.snapshot?.property?.name ?? null,
            checkIn: b.stay?.checkIn ?? null,
          },
          deps,
        ),
      ]
    : [];
  const moved = await transition(BookingRecord, {
    id: b._id,
    from: m.from,
    to: m.to,
    set: m.set,
    events,
    clock: deps.clock,
    options: ENGINE,
  });
  if (moved)
    await BookingStatusRecord.create({
      bookingId: String(b._id),
      hotelOrgId: b.hotelOrgId,
      from: b.status,
      to: m.to,
      at: deps.clock.now(),
      by: m.by,
      note: m.note ?? null,
    });
  return moved;
}
