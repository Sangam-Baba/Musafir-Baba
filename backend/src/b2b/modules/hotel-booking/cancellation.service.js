// @ts-check
/**
 * Cancellation terms of a booking for its buyer (plan Stage 09 §3.3–3.4): the deadlines from the policy copy kept at
 * booking time — as moments, and in hotel time — what cancelling now would cost, and whether it can still be cancelled
 * online (confirmed, before the check-in day in hotel time). The quote and the cancel itself build on this (S09-T04/T05).
 */
import { todayIn } from '../../core/dates.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { bookingView } from './booking.service.js';
import { cancellationCharge, checkInAt, deadlines, nightAmounts } from './domain/cancellation-charge.js';
import { BookingRecord } from './models/booking.model.js';

const READ = systemScope('hotel-booking: cancellation terms', { routine: true });
export const BUFFER_HOURS = 0; // D5 (owner, for now): our deadline = the hotel's

/** @param {Date} d @param {string} timeZone */
const hotelTime = (d, timeZone) =>
  d.toLocaleString('en-IN', { timeZone, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** @param {string} ref */
export async function bookingByRef(ref) {
  const canonical = parseReference(ref);
  const b = canonical?.startsWith('MBH-') ? await BookingRecord.findOne({ ref: canonical }).setOptions(READ).lean() : null;
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/**
 * @param {Record<string, any>} b the booking
 * @param {Date} now
 */
export function termsOf(b, now) {
  const p = b.snapshot.property;
  const tz = p.timeZone ?? 'Asia/Kolkata';
  const checkIn = checkInAt(b.stay, p);
  const d = deadlines(b.snapshot.policy, checkIn, BUFFER_HOURS);
  const paid = b.totalPaise;
  const nowCharge = cancellationCharge({
    policy: b.snapshot.policy,
    checkIn,
    now,
    bufferHours: BUFFER_HOURS,
    paidPaise: paid,
    nights: nightAmounts(b.price),
  });
  const beforeCheckInDay = todayIn({ now: () => now }, tz) < b.stay.checkIn;
  return {
    timeZone: tz,
    checkInAt: checkIn.toISOString(),
    checkInHotelTime: hotelTime(checkIn, tz),
    nonRefundable: d.nonRefundable,
    freeUntil: d.freeUntil ? { at: d.freeUntil.toISOString(), hotelTime: hotelTime(d.freeUntil, tz) } : null,
    steps: d.steps.map((s) => ({ from: s.from ? { at: s.from.toISOString(), hotelTime: hotelTime(s.from, tz) } : null, text: s.text })),
    summary: b.snapshot.policy.summary,
    ifCancelledNow: { chargePaise: nowCharge.chargePaise, refundPaise: nowCharge.refundPaise },
    canCancelOnline: b.status === 'CONFIRMED' && beforeCheckInDay,
  };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createCustomerBookings(deps) {
  return {
    /** The booking (buyer view) and its terms — the caller checks the buyer owns the order first. @param {string} ref */
    async detail(ref) {
      const b = await bookingByRef(ref);
      return { orderId: b.orderId, orderRef: b.orderRef, booking: bookingView(b, 'BUYER'), terms: termsOf(b, deps.clock.now()) };
    },
    bookingByRef,
  };
}
