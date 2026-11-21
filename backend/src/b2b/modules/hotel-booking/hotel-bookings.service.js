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
import { todayIn } from '../../core/dates.js';
import { noShowWindow } from './domain/cancellation-charge.js';
import { authz } from '../access/index.js';
import { EVENTS } from './events.js';
import { PERMISSIONS } from './permissions.js';
import { BookingRecord } from './models/booking.model.js';

const SEEN = ['CONFIRMED', 'CANCELLING', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'HOTEL_FAILED'];

/**
 * The hotel inbox views (plan Stage 09 §3.6) for a day (hotel's date, default today in India).
 * @type {Record<string, { filter: (day: string) => Record<string, unknown>, sort: Record<string, 1 | -1> }>}
 */
export const VIEWS = {
  all: { filter: () => ({ status: { $in: SEEN } }), sort: { confirmedAt: -1 } },
  waiting: { filter: () => ({ status: 'CONFIRMED', acknowledgedAt: null }), sort: { confirmedAt: 1 } },
  arrivals: { filter: (day) => ({ 'stay.checkIn': day, status: { $in: ['CONFIRMED', 'NO_SHOW'] } }), sort: { 'stay.checkIn': 1 } },
  departures: { filter: (day) => ({ 'stay.checkOut': day, status: { $in: ['CONFIRMED', 'COMPLETED'] } }), sort: { 'stay.checkOut': 1 } },
  upcoming: { filter: (day) => ({ 'stay.checkIn': { $gt: day }, status: 'CONFIRMED' }), sort: { 'stay.checkIn': 1 } },
  cancellations: { filter: () => ({ status: { $in: ['CANCELLING', 'CANCELLED'] } }), sort: { statusChangedAt: -1 } },
  'no-shows': { filter: () => ({ status: 'NO_SHOW' }), sort: { statusChangedAt: -1 } },
};
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
    noShow: noShowTimes(b),
  };
}

/** When the hotel may mark a no-show (only for confirmed bookings). @param {Record<string, any>} b */
function noShowTimes(b) {
  if (b.status !== 'CONFIRMED') return null;
  const w = noShowWindow(b.stay, b.snapshot?.property?.timeZone ?? 'Asia/Kolkata');
  return { from: w.from.toISOString(), until: w.until.toISOString() };
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
    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ propertyId?: string, waiting?: boolean, view?: string, date?: string }} q */
    async list(ctx, q) {
      authz.assert(ctx, PERMISSIONS.bookingRead);
      const day = q.date ?? todayIn(deps.clock, 'Asia/Kolkata');
      const view = q.view ?? (q.waiting ? 'waiting' : 'all');
      const v = /** @type {{ filter: (day: string) => Record<string, unknown>, sort: Record<string, 1 | -1> }} */ (
        VIEWS[view] ?? VIEWS.all
      );
      const filter = { ...authz.scopeFilter(ctx, { orgField: 'hotelOrgId', propertyField: 'propertyId' }), ...v.filter(day) };
      if (q.propertyId) Object.assign(filter, { propertyId: q.propertyId });
      const docs = await BookingRecord.find(filter).sort(v.sort).limit(200).lean();
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

/**
 * MusafirBaba operations: confirmed bookings not acknowledged after an hour (ops queue `hotel-ack`) — whom to call.
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 */
export async function overdueAcknowledgements(deps) {
  const before = new Date(deps.clock.now().getTime() - 60 * 60_000);
  const docs = await BookingRecord.find({ status: 'CONFIRMED', acknowledgedAt: null, confirmedAt: { $lte: before } })
    .setOptions(ESCALATE)
    .sort({ confirmedAt: 1 })
    .limit(100)
    .lean();
  return docs.map((b) => {
    const p = /** @type {any} */ (b.snapshot)?.property ?? {};
    return {
      ref: b.ref,
      orderRef: b.orderRef,
      propertyName: p.name ?? null,
      city: p.cityName ?? null,
      phone: p.contacts?.phone ?? null,
      email: p.contacts?.email ?? null,
      checkIn: b.stay.checkIn,
      confirmedAt: b.confirmedAt,
      hotelOrgId: b.hotelOrgId,
    };
  });
}

/**
 * Check (every 10 min): every booked night belongs to a confirmed (or being-cancelled) booking. A booking that changed
 * in the last 10 minutes is skipped (a confirm in progress books the nights a moment before the booking says so).
 * @param {{ clock: import('../../core/clock.js').Clock, owners: () => Promise<string[]> }} deps
 */
export function bookingInvariants(deps) {
  return [
    {
      name: 'hotel-booking-booked-nights-belong-to-confirmed-bookings',
      check: async () => {
        const ids = (await deps.owners()).filter((id) => /^[a-f0-9]{24}$/.test(id));
        if (ids.length === 0) return [];
        const recent = new Date(deps.clock.now().getTime() - 10 * 60_000);
        const docs = await BookingRecord.find({ _id: { $in: ids } }, { status: 1, statusChangedAt: 1, ref: 1 })
          .setOptions(ESCALATE)
          .lean();
        const byId = new Map(docs.map((d) => [String(d._id), d]));
        return ids
          .filter((id) => {
            const b = byId.get(id);
            if (!b) return true;
            return !['CONFIRMED', 'CANCELLING'].includes(b.status) && b.statusChangedAt < recent;
          })
          .map((id) => ({ id, detail: `nights booked for ${byId.get(id)?.ref ?? id}, which is ${byId.get(id)?.status ?? 'unknown'}` }));
      },
    },
  ];
}
