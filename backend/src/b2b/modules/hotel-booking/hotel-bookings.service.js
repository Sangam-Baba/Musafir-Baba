// @ts-check
/**
 * The hotel's side of bookings (plan Stage 08 §3.9, §5, §8 "guest PII to the wrong hotel"): its own confirmed
 * bookings only (other hotels' → 404; staff limited to some properties see only those), minimal fields — guests,
 * dates, room, requests, what the hotel is owed — never MusafirBaba's price or the customer's email / phone.
 * Acknowledging stops the reminders (one conditional update: the first person wins, again changes nothing).
 * Reminders (`ackEscalation`): not acknowledged after 15 min → the hotel again; 30 min → the hotel's owners;
 * 60 min → MusafirBaba operations (ops queue). Each step once, as an event in the booking (notifications deliver).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { authz } from '../access/index.js';
import { EVENTS } from './events.js';
import { PERMISSIONS } from './permissions.js';
import { BookingRecord } from './models/booking.model.js';

const SEEN = ['CONFIRMED', 'CANCELLING', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'HOTEL_FAILED'];
const ESCALATE = systemScope('hotel-booking: acknowledgement reminders', { routine: true });

/** Reminder steps (minutes after confirmation → event). */
export const ACK_STEPS = Object.freeze([
  { level: 1, afterMinutes: 15, event: EVENTS.bookingAckReminded },
  { level: 2, afterMinutes: 30, event: EVENTS.bookingAckEscalated },
  { level: 3, afterMinutes: 60, event: EVENTS.bookingAckOverdue },
]);

/** What the hotel sees. @param {Record<string, any>} b */
export function hotelView(b) {
  const snap = b.snapshot ?? {};
  return {
    ref: b.ref,
    status: b.status,
    propertyId: b.propertyId,
    propertyName: snap.property?.name ?? null,
    roomTypeName: snap.roomTypeName ?? null,
    ratePlanName: snap.ratePlanName ?? null,
    mealPlanKey: snap.mealPlanKey ?? null,
    checkIn: b.stay.checkIn,
    checkOut: b.stay.checkOut,
    nights: b.stay.nights.length,
    rooms: roomsOf(b),
    specialRequests: b.specialRequests ?? null,
    payablePaise: b.price?.totals?.hotelPayablePaise ?? null, // the hotel's rate + its GST — never MusafirBaba's price
    cancellation: snap.policy?.summary ?? null,
    confirmedAt: b.confirmedAt,
    acknowledgedAt: b.acknowledgedAt ?? null,
  };
}

/** Each room's occupancy and guest names. @param {Record<string, any>} b */
const roomsOf = (b) =>
  b.stay.occupancies.map((/** @type {any} */ o, /** @type {number} */ i) => ({
    ...o,
    leadGuest: b.rooms[i]?.leadGuest ?? null,
    guests: b.rooms[i]?.guests ?? [],
  }));

/** @param {import('../../core/context.js').RequestContext} ctx @param {string} ref */
async function own(ctx, ref) {
  const canonical = parseReference(ref);
  const b = canonical?.startsWith('MBH-')
    ? await BookingRecord.findOne({ ref: canonical, status: { $in: SEEN } })
        .setOptions(ESCALATE)
        .lean()
    : null;
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  authz.assert(ctx, PERMISSIONS.bookingRead, { orgId: b.hotelOrgId, propertyId: b.propertyId });
  return /** @type {Record<string, any>} */ (b);
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createHotelBookingsService(deps) {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ propertyId?: string, waiting?: boolean }} q */
    async list(ctx, q) {
      authz.assert(ctx, PERMISSIONS.bookingRead);
      const filter = { ...authz.scopeFilter(ctx, { orgField: 'hotelOrgId', propertyField: 'propertyId' }), status: { $in: SEEN } };
      if (q.propertyId) Object.assign(filter, { propertyId: q.propertyId });
      if (q.waiting) Object.assign(filter, { status: 'CONFIRMED', acknowledgedAt: null });
      const docs = await BookingRecord.find(filter).sort({ confirmedAt: -1 }).limit(200).lean();
      return docs.map(hotelView);
    },
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} ref */
    read: async (ctx, ref) => hotelView(await own(ctx, ref)),
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} ref */
    async acknowledge(ctx, ref) {
      const b = await own(ctx, ref);
      authz.assert(ctx, PERMISSIONS.bookingAcknowledge, { orgId: b.hotelOrgId, propertyId: b.propertyId });
      const by = ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system';
      const event = newEvent(
        EVENTS.bookingAcknowledged,
        { orgId: b.hotelOrgId, bookingId: String(b._id), ref: b.ref, propertyId: b.propertyId, name: b.snapshot?.property?.name ?? null },
        deps,
      );
      await BookingRecord.updateOne(
        { _id: b._id, acknowledgedAt: null },
        { $set: { acknowledgedAt: deps.clock.now(), acknowledgedBy: by, hasPendingEvents: true }, $push: { pendingEvents: event } },
      ).setOptions(ESCALATE);
      return hotelView(await own(ctx, ref));
    },
  };
}

/**
 * Every minute: confirmed bookings of the last day not acknowledged → the next reminder step due, once each (a step
 * is only moved forward; after downtime only the highest due step is sent).
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 */
export async function ackEscalation(deps) {
  const now = deps.clock.now().getTime();
  const due = await BookingRecord.find(
    {
      status: 'CONFIRMED',
      acknowledgedAt: null,
      confirmedAt: { $gte: new Date(now - 86_400_000), $lte: new Date(now - 15 * 60_000) },
      escalationLevel: { $lt: 3 },
    },
    { ref: 1, hotelOrgId: 1, propertyId: 1, confirmedAt: 1, escalationLevel: 1, snapshot: 1 },
  )
    .setOptions(ESCALATE)
    .limit(200)
    .lean();
  let sent = 0;
  for (const b of due) {
    const minutes = (now - new Date(/** @type {Date} */ (b.confirmedAt)).getTime()) / 60_000;
    const step = [...ACK_STEPS].reverse().find((s) => minutes >= s.afterMinutes);
    if (!step || step.level <= (b.escalationLevel ?? 0)) continue;
    const payload = {
      orgId: b.hotelOrgId,
      bookingId: String(b._id),
      ref: b.ref,
      propertyId: b.propertyId,
      name: /** @type {any} */ (b.snapshot)?.property?.name ?? null,
      phone: /** @type {any} */ (b.snapshot)?.property?.contacts?.phone ?? null,
      level: step.level,
    };
    const res = await BookingRecord.updateOne(
      { _id: b._id, acknowledgedAt: null, escalationLevel: b.escalationLevel ?? 0 },
      { $set: { escalationLevel: step.level, hasPendingEvents: true }, $push: { pendingEvents: newEvent(step.event, payload, deps) } },
    ).setOptions(ESCALATE);
    sent += res.modifiedCount;
  }
  return { sent };
}
