// @ts-check
/**
 * Change requests (plan Stage 09 §3.5). Buyer: open one on their booking (at most 5 open per booking), reply, read the
 * thread (staff shown as "MusafirBaba"). MusafirBaba: the queue (oldest due first, with the 4-hour first-response time),
 * reply (asking the buyer or not), set the status with a resolution, and apply a guest-name correction to the booking —
 * recorded in the booking's history. Every change is one update that also stores its event.
 */
import { randomInt } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { AmendmentRecord, FIRST_RESPONSE_HOURS } from './models/amendment.model.js';
import { BookingRecord } from './models/booking.model.js';
import { BookingStatusRecord } from './models/status-history.model.js';

const SCOPE = systemScope('hotel-booking: change requests', { routine: true });
const NAME = /^[\p{L}][\p{L} .'-]{0,59}$/u;
const LETTERS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const OPEN = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'];
const MAX_OPEN_PER_BOOKING = 5;

/** @typedef {{ clock: import('../../core/clock.js').Clock }} AmendDeps */

const newRef = () => `CR-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;

/** What the buyer sees (staff names stay inside MusafirBaba). @param {Record<string, any>} a */
export const buyerAmendment = (a) => ({
  id: String(a._id),
  ref: a.ref,
  type: a.type,
  status: a.status,
  guestNames: a.guestNames,
  guestNamesApplied: a.guestNamesApplied,
  messages: a.messages.map((/** @type {any} */ m) => ({ at: m.at, from: m.from === 'STAFF' ? 'MusafirBaba' : 'You', text: m.text })),
  resolution: a.resolution,
  createdAt: a.createdAt,
});

/** @param {Record<string, any>} a */
export const adminAmendment = (a) => ({
  ...buyerAmendment(a),
  bookingRef: a.bookingRef,
  orderRef: a.orderRef,
  messages: a.messages,
  firstResponseDueAt: a.firstResponseDueAt,
  firstRespondedAt: a.firstRespondedAt,
  handledBy: a.handledBy,
  version: a.version,
});

/** @param {AmendDeps} deps @param {Record<string, any>} a @param {string} type */
const eventOf = (deps, a, type) =>
  newEvent(
    type,
    { orgId: a.hotelOrgId, amendmentId: String(a._id), ref: a.ref, bookingRef: a.bookingRef, orderId: a.orderId, type: a.type },
    deps,
  );

/**
 * One conditional update with a message and/or fields, plus its event.
 * @param {AmendDeps} deps
 * @param {Record<string, any>} a
 * @param {{ message?: { from: 'BUYER' | 'STAFF', by: string, text: string }, set?: Record<string, unknown>, event?: string }} c
 */
async function change(deps, a, c) {
  /** @type {Record<string, any>} */
  const update = { $set: { ...(c.set ?? {}) }, $inc: { version: 1 } };
  if (c.message) update.$push = { messages: { at: deps.clock.now(), ...c.message } };
  if (c.event) {
    update.$set.hasPendingEvents = true;
    update.$push = { ...(update.$push ?? {}), pendingEvents: eventOf(deps, a, c.event) };
  }
  const res = await AmendmentRecord.updateOne({ _id: a._id, version: a.version }, update).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('AMENDMENT_CHANGED');
  return /** @type {Record<string, any>} */ (await AmendmentRecord.findById(a._id).setOptions(SCOPE).lean());
}

/** @param {string} id */
async function load(id) {
  const a = /^[a-f0-9]{24}$/.test(id) ? await AmendmentRecord.findById(id).setOptions(SCOPE).lean() : null;
  if (!a) throw new NotFoundError('AMENDMENT_NOT_FOUND');
  return /** @type {Record<string, any>} */ (a);
}

/**
 * @param {AmendDeps} deps
 * @param {Record<string, any>} b the booking (the caller checked the buyer)
 * @param {{ by: string, type: string, message: string, guestNames?: { room: number, leadGuest: string }[] }} input
 */
async function open(deps, b, input) {
  const changes = ['MODIFY_DATES', 'MODIFY_GUESTS', 'UPGRADE_ROOM'].includes(input.type);
  if (changes ? b.status !== 'CONFIRMED' : !['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'HOTEL_FAILED'].includes(b.status))
    throw new ConflictError('BOOKING_CANNOT_BE_CHANGED', { bookingStatus: b.status });
  const names = (input.guestNames ?? []).map((g) => ({ room: g.room, leadGuest: g.leadGuest.trim() }));
  if (input.type === 'MODIFY_GUESTS' && (names.length === 0 || names.some((g) => !NAME.test(g.leadGuest) || !b.rooms[g.room - 1])))
    throw new DomainError('GUEST_NAMES_INVALID');
  if ((await AmendmentRecord.countDocuments({ bookingId: String(b._id), status: { $in: OPEN } }).setOptions(SCOPE)) >= MAX_OPEN_PER_BOOKING)
    throw new ConflictError('TOO_MANY_OPEN_REQUESTS');
  const now = deps.clock.now();
  const doc = await AmendmentRecord.create({
    ref: newRef(),
    bookingId: String(b._id),
    bookingRef: b.ref,
    orderId: b.orderId,
    orderRef: b.orderRef,
    hotelOrgId: b.hotelOrgId,
    customerId: b.customerId ?? null,
    guestKey: b.guestKey ?? null,
    clientOrgId: b.clientOrgId ?? null,
    type: input.type,
    status: 'OPEN',
    guestNames: input.type === 'MODIFY_GUESTS' ? names : [],
    messages: [{ at: now, from: 'BUYER', by: input.by, text: input.message.trim() }],
    firstResponseDueAt: new Date(now.getTime() + FIRST_RESPONSE_HOURS * 3_600_000),
  });
  const a = /** @type {Record<string, any>} */ (doc.toObject());
  await AmendmentRecord.updateOne(
    { _id: a._id },
    { $set: { hasPendingEvents: true }, $push: { pendingEvents: eventOf(deps, a, EVENTS.amendmentOpened) } },
  ).setOptions(SCOPE);
  return buyerAmendment(a);
}

/**
 * Staff apply the requested lead guest names to the booking (confirmed only), noted in its history.
 * @param {AmendDeps} deps
 * @param {string} by
 * @param {string} id
 */
async function applyGuestNames(deps, by, id) {
  const a = await load(id);
  if (a.type !== 'MODIFY_GUESTS' || a.guestNamesApplied) throw new ConflictError('NOTHING_TO_APPLY');
  const b = /** @type {any} */ (await BookingRecord.findOne({ _id: a.bookingId }).setOptions(SCOPE).lean());
  /** @type {Record<string, string>} */
  const set = {};
  for (const g of a.guestNames) set[`rooms.${g.room - 1}.leadGuest`] = g.leadGuest;
  const res = await BookingRecord.updateOne({ _id: a.bookingId, status: 'CONFIRMED' }, { $set: set }).setOptions(SCOPE);
  if (res.modifiedCount !== 1 && res.matchedCount !== 1) throw new ConflictError('BOOKING_CANNOT_BE_CHANGED', { bookingStatus: b?.status });
  const before = a.guestNames
    .map((/** @type {any} */ g) => `room ${g.room}: ${b?.rooms?.[g.room - 1]?.leadGuest ?? '—'} → ${g.leadGuest}`)
    .join('; ');
  await BookingStatusRecord.create({
    bookingId: a.bookingId,
    hotelOrgId: a.hotelOrgId,
    from: 'CONFIRMED',
    to: 'CONFIRMED',
    at: deps.clock.now(),
    by,
    note: `guest names changed (${a.ref}): ${before}`.slice(0, 500),
  });
  return adminAmendment(
    await change(deps, a, {
      set: { guestNamesApplied: true },
      message: { from: 'STAFF', by, text: 'Guest names updated on your booking.' },
      event: EVENTS.amendmentStaffReplied,
    }),
  );
}

/** @param {AmendDeps} deps */
export function createAmendments(deps) {
  return {
    /** @param {Record<string, any>} booking @param {{ by: string, type: string, message: string, guestNames?: { room: number, leadGuest: string }[] }} input */
    open: (booking, input) => open(deps, booking, input),
    /** @param {string} bookingId */
    forBooking: async (bookingId) =>
      (await AmendmentRecord.find({ bookingId }).setOptions(SCOPE).sort({ createdAt: -1 }).limit(20).lean()).map(buyerAmendment),
    /** @param {string} bookingId @param {string} id @param {string} by @param {string} text */
    async buyerReply(bookingId, id, by, text) {
      const a = await load(id);
      if (a.bookingId !== bookingId) throw new NotFoundError('AMENDMENT_NOT_FOUND');
      if (!OPEN.includes(a.status)) throw new ConflictError('AMENDMENT_CLOSED');
      return buyerAmendment(
        await change(deps, a, {
          message: { from: 'BUYER', by, text: text.trim() },
          set: { status: a.status === 'WAITING_CUSTOMER' ? 'OPEN' : a.status },
          event: EVENTS.amendmentBuyerReplied,
        }),
      );
    },
    /** @param {{ status?: string }} q */
    queue: async (q) =>
      (
        await AmendmentRecord.find(q.status ? { status: q.status } : { status: { $in: OPEN } })
          .setOptions(SCOPE)
          .sort({ firstResponseDueAt: 1 })
          .limit(200)
          .lean()
      ).map(adminAmendment),
    /** @param {string} id */
    read: async (id) => adminAmendment(await load(id)),
    /** @param {string} by @param {string} id @param {{ text: string, waitForCustomer: boolean }} r */
    async staffReply(by, id, r) {
      const a = await load(id);
      if (!OPEN.includes(a.status)) throw new ConflictError('AMENDMENT_CLOSED');
      const set = {
        status: r.waitForCustomer ? 'WAITING_CUSTOMER' : 'IN_PROGRESS',
        handledBy: by,
        ...(a.firstRespondedAt ? {} : { firstRespondedAt: deps.clock.now() }),
      };
      return adminAmendment(
        await change(deps, a, { message: { from: 'STAFF', by, text: r.text.trim() }, set, event: EVENTS.amendmentStaffReplied }),
      );
    },
    /** @param {string} by @param {string} id @param {{ status: 'RESOLVED' | 'CLOSED', resolution: string }} r */
    async close(by, id, r) {
      const a = await load(id);
      if (!OPEN.includes(a.status)) throw new ConflictError('AMENDMENT_CLOSED');
      return adminAmendment(
        await change(deps, a, { set: { status: r.status, resolution: r.resolution.trim(), handledBy: by }, event: EVENTS.amendmentClosed }),
      );
    },
    /** @param {string} by @param {string} id */
    applyGuestNames: (by, id) => applyGuestNames(deps, by, id),
  };
}
