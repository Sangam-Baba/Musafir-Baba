// @ts-check
/**
 * Stays that ended (plan Stage 09 §3.8) and what each booking owes its hotel (§3.9 — the wallet module keeps the payable).
 * - `completeStays`: hourly — confirmed bookings whose check-out day is over in the hotel's time → COMPLETED
 *   (+ `hotel-booking.booking.completed`; the payable becomes ready to pay).
 * - `payableState`: what the hotel is owed for a booking now, and whether it can be paid — the same amounts the ledger
 *   holds on the hotel's payable account: confirmed / completed → its rate + its GST; cancelled → its share of the charge;
 *   no-show → its share of the no-show charge (payable once final); hotel failed → nothing.
 */
import { todayIn } from '../../core/dates.js';
import { ENGINE, moveBooking } from './booking-steps.js';
import { splitCharge } from './domain/cancellation-charge.js';
import { EVENTS } from './events.js';
import { BookingRecord } from './models/booking.model.js';
import { NoShowRecord } from './models/no-show.model.js';

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export async function completeStays(deps) {
  const latest = todayIn(deps.clock, 'Pacific/Kiritimati'); // the furthest-ahead time zone: nothing later can have ended
  const due = await BookingRecord.find({ status: 'CONFIRMED', 'stay.checkOut': { $lt: latest } })
    .setOptions(ENGINE)
    .limit(500)
    .lean();
  let completed = 0;
  for (const b of due) {
    if (b.stay.checkOut >= todayIn(deps.clock, /** @type {any} */ (b.snapshot)?.property?.timeZone ?? 'Asia/Kolkata')) continue;
    if (await moveBooking(deps, b, { from: 'CONFIRMED', to: 'COMPLETED', by: 'system:completion', event: EVENTS.bookingCompleted }))
      completed += 1;
  }
  return { completed };
}

/**
 * @param {string} bookingId
 * @returns {Promise<{ bookingId: string, bookingRef: string, orderRef: string, hotelOrgId: string, propertyId: string,
 *   checkOut: string, amountPaise: number, state: 'PENDING' | 'ELIGIBLE' | 'VOID' } | null>}
 */
export async function payableState(bookingId) {
  const b = /** @type {any} */ (
    /^[a-f0-9]{24}$/.test(bookingId) ? await BookingRecord.findOne({ _id: bookingId }).setOptions(ENGINE).lean() : null
  );
  if (!b || ['HELD', 'EXPIRED', 'FAILED'].includes(b.status)) return null; // never confirmed: nothing owed
  const base = {
    bookingId: String(b._id),
    bookingRef: b.ref,
    orderRef: b.orderRef,
    hotelOrgId: b.hotelOrgId,
    propertyId: b.propertyId,
    checkOut: b.stay.checkOut,
  };
  if (b.status === 'HOTEL_FAILED') return { ...base, amountPaise: 0, state: 'VOID' };
  if (b.status === 'CANCELLED' || b.status === 'CANCELLING') return { ...base, ...cancelledOwed(b) };
  if (b.status === 'NO_SHOW') return { ...base, ...(await noShowOwed(b)) };
  const t = b.price.totals;
  return { ...base, amountPaise: t.hotelPayablePaise, state: b.status === 'COMPLETED' ? 'ELIGIBLE' : 'PENDING' };
}

/** A cancelled booking: the hotel's share of the charge — payable once the cancellation is complete. @param {any} b */
function cancelledOwed(b) {
  const amount = b.cancellation?.hotelSharePaise ?? 0;
  if (amount <= 0) return { amountPaise: 0, state: /** @type {const} */ ('VOID') };
  return { amountPaise: amount, state: b.status === 'CANCELLED' ? /** @type {const} */ ('ELIGIBLE') : /** @type {const} */ ('PENDING') };
}

/** A no-show: the hotel's share of the no-show charge — payable once final and settled. @param {any} b */
async function noShowOwed(b) {
  const t = b.price.totals;
  const n = /** @type {any} */ (
    await NoShowRecord.findOne({ bookingId: String(b._id) })
      .setOptions(ENGINE)
      .lean()
  );
  const amount = n
    ? splitCharge({ chargePaise: n.chargePaise, totalPaise: t.totalPaise, hotelPayablePaise: t.hotelPayablePaise }).hotelPaise
    : t.hotelPayablePaise;
  const final = n?.status === 'FINAL' && n.settled === true;
  if (!final) return { amountPaise: amount, state: /** @type {const} */ ('PENDING') };
  return { amountPaise: amount, state: amount > 0 ? /** @type {const} */ ('ELIGIBLE') : /** @type {const} */ ('VOID') };
}
