// @ts-check
/**
 * Trips that ended (plan Stage 18 B7): a CONFIRMED bus booking whose getting-off moment was more than 2 hours ago →
 * COMPLETED (+ `bus-booking.booking.completed`, which makes its payable ready to pay and the order complete). Hourly,
 * repeat-safe (conditional on the status).
 */
import { newEvent } from '../../core/db/events.js';
import { ENGINE } from './engine-scope.js';
import { EVENTS } from './events.js';
import { BusBookingRecord } from './models/booking.model.js';

const AFTER_MS = 2 * 60 * 60_000;

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export async function completeTrips(deps) {
  const now = deps.clock.now();
  const done = await BusBookingRecord.find(
    { status: 'CONFIRMED', 'to.at': { $lte: new Date(now.getTime() - AFTER_MS) } },
    { _id: 1, ref: 1, orderId: 1, operatorOrgId: 1, tripId: 1 },
  )
    .setOptions(ENGINE)
    .limit(1000)
    .lean();
  let completed = 0;
  for (const b of done) {
    const event = newEvent(
      EVENTS.bookingCompleted,
      { orgId: b.operatorOrgId, bookingId: String(b._id), ref: b.ref, orderId: b.orderId, tripId: b.tripId },
      deps,
    );
    const res = await BusBookingRecord.updateOne(
      { _id: b._id, status: 'CONFIRMED' },
      {
        $set: { status: 'COMPLETED', statusChangedAt: now, hasPendingEvents: true },
        $push: { pendingEvents: event, history: { at: now, from: 'CONFIRMED', to: 'COMPLETED', by: 'system:completion', note: null } },
      },
    ).setOptions(ENGINE);
    completed += res.modifiedCount;
  }
  return { completed };
}
