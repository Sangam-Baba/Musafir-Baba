// @ts-check
/**
 * No-shows (plan Stage 09 §3.6, §6, §7 "false no-show by hotel"):
 * - the hotel marks (own property, `hotel-booking.booking.markNoShow`, confirmed booking, from 12:00 on the check-in day
 *   until the end of the check-out day, hotel time) → booking NO_SHOW; the charge from the booking's no-show policy;
 * - the buyer may dispute within 72 hours → MusafirBaba upholds (final) or reverses (booking COMPLETED — the guest
 *   stayed; nothing is charged beyond the booking);
 * - final (window over, or upheld) → the money is settled by the orders module (unused part refunded, ledger pro rata).
 * Every step is one conditional update; events tell the buyer (marked) and MusafirBaba's queue (disputed).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { authz } from '../access/index.js';
import { ENGINE, moveBooking } from './booking-steps.js';
import { chargeFor, nightAmounts, noShowWindow } from './domain/cancellation-charge.js';
import { EVENTS } from './events.js';
import { BookingRecord } from './models/booking.model.js';
import { DISPUTE_HOURS, NoShowRecord } from './models/no-show.model.js';
import { PERMISSIONS } from './permissions.js';

const SCOPE = systemScope('hotel-booking: no-shows', { routine: true });

/** @typedef {{ clock: import('../../core/clock.js').Clock }} NoShowDeps */

/** @param {Record<string, any>} n */
export const noShowDto = (n) => ({
  id: String(n._id),
  bookingRef: n.bookingRef,
  orderRef: n.orderRef,
  status: n.status,
  markedAt: n.markedAt,
  disputeUntil: n.disputeUntil,
  chargePaise: n.chargePaise,
  refundPaise: n.refundPaise,
  dispute: n.dispute ? { at: n.dispute.at, message: n.dispute.message } : null,
  resolution: n.resolution ? { at: n.resolution.at, decision: n.resolution.decision, note: n.resolution.note } : null,
});

/** @param {NoShowDeps} deps @param {Record<string, any>} n @param {string} type */
const eventOf = (deps, n, type) =>
  newEvent(
    type,
    {
      orgId: n.hotelOrgId,
      noShowId: String(n._id),
      bookingId: n.bookingId,
      bookingRef: n.bookingRef,
      orderId: n.orderId,
      ref: n.orderRef,
      status: n.status,
    },
    deps,
  );

/**
 * The hotel marks a no-show.
 * @param {NoShowDeps} deps
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {string} ref
 */
async function mark(deps, ctx, ref) {
  const canonical = parseReference(ref);
  const b = /** @type {any} */ (
    canonical?.startsWith('MBH-') ? await BookingRecord.findOne({ ref: canonical }).setOptions(ENGINE).lean() : null
  );
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  authz.assert(ctx, PERMISSIONS.bookingMarkNoShow, { orgId: b.hotelOrgId, propertyId: b.propertyId });
  if (b.status !== 'CONFIRMED') throw new ConflictError('BOOKING_NOT_CONFIRMED', { bookingStatus: b.status });
  const now = deps.clock.now();
  const w = noShowWindow(b.stay, b.snapshot.property.timeZone ?? 'Asia/Kolkata');
  if (now < w.from || now >= w.until) throw new DomainError('NO_SHOW_NOT_NOW', { from: w.from, until: w.until });
  const money = chargeFor(b.snapshot.policy.noShow ?? { type: 'PERCENT', value: 100 }, {
    paidPaise: b.totalPaise,
    nights: nightAmounts(b.price),
  });
  const by = ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system';
  if (!(await moveBooking(deps, b, { from: 'CONFIRMED', to: 'NO_SHOW', by, note: 'marked by the hotel' })))
    throw new ConflictError('BOOKING_NOT_CONFIRMED');
  const doc = {
    bookingId: String(b._id),
    bookingRef: b.ref,
    orderId: b.orderId,
    orderRef: b.orderRef,
    hotelOrgId: b.hotelOrgId,
    propertyId: b.propertyId,
    markedBy: by,
    markedAt: now,
    disputeUntil: new Date(now.getTime() + DISPUTE_HOURS * 3_600_000),
    ...money,
    status: 'DISPUTE_WINDOW',
  };
  const created = /** @type {any} */ ((await NoShowRecord.create(doc)).toObject());
  await NoShowRecord.updateOne(
    { _id: created._id },
    { $set: { hasPendingEvents: true }, $push: { pendingEvents: eventOf(deps, created, EVENTS.noShowMarked) } },
  ).setOptions(SCOPE);
  return noShowDto(created);
}

/** @param {string} bookingId */
async function ofBooking(bookingId) {
  const n = await NoShowRecord.findOne({ bookingId }).setOptions(SCOPE).lean();
  if (!n) throw new NotFoundError('NO_SHOW_NOT_FOUND');
  return /** @type {Record<string, any>} */ (n);
}

/** @param {NoShowDeps} deps */
export function createNoShows(deps) {
  /** @param {Record<string, any>} n @param {string} from @param {Record<string, unknown>} set @param {string} [event] */
  const move = async (n, from, set, event) => {
    const res = await NoShowRecord.updateOne(
      { _id: n._id, status: from },
      {
        $set: { ...set, ...(event ? { hasPendingEvents: true } : {}) },
        ...(event ? { $push: { pendingEvents: eventOf(deps, { ...n, ...set }, event) } } : {}),
      },
    ).setOptions(SCOPE);
    return res.modifiedCount === 1;
  };
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} ref */
    mark: (ctx, ref) => mark(deps, ctx, ref),
    /** The buyer's view of a booking's no-show (or null). @param {string} bookingId */
    forBooking: async (bookingId) => {
      const n = await NoShowRecord.findOne({ bookingId }).setOptions(SCOPE).lean();
      return n ? noShowDto(n) : null;
    },
    /** @param {string} bookingId @param {string} by @param {string} message */
    async dispute(bookingId, by, message) {
      const n = await ofBooking(bookingId);
      if (n.status !== 'DISPUTE_WINDOW' || deps.clock.now() >= n.disputeUntil) throw new ConflictError('DISPUTE_CLOSED');
      await move(
        n,
        'DISPUTE_WINDOW',
        { status: 'DISPUTED', dispute: { at: deps.clock.now(), by, message: message.trim() } },
        EVENTS.noShowDisputed,
      );
      return noShowDto(await ofBooking(bookingId));
    },
    disputes: async () =>
      (await NoShowRecord.find({ status: 'DISPUTED' }).setOptions(SCOPE).sort({ 'dispute.at': 1 }).limit(200).lean()).map(noShowDto),
    /** @param {string} by @param {string} id @param {{ decision: 'UPHOLD' | 'REVERSE', note: string }} d */
    async resolve(by, id, d) {
      const n = /^[a-f0-9]{24}$/.test(id) ? await NoShowRecord.findById(id).setOptions(SCOPE).lean() : null;
      if (!n) throw new NotFoundError('NO_SHOW_NOT_FOUND');
      const resolution = { at: deps.clock.now(), by, decision: d.decision, note: d.note.trim() };
      if (d.decision === 'REVERSE') {
        const b = /** @type {any} */ (await BookingRecord.findOne({ _id: n.bookingId }).setOptions(ENGINE).lean());
        if (!(await move(n, 'DISPUTED', { status: 'REVERSED', resolution, settled: true }, EVENTS.noShowResolved)))
          throw new ConflictError('NO_SHOW_ALREADY_DECIDED');
        await moveBooking(deps, b, { from: 'NO_SHOW', to: 'COMPLETED', by, note: `no-show reversed: ${d.note}`.slice(0, 500) });
      } else if (!(await move(n, 'DISPUTED', { status: 'FINAL', resolution }, EVENTS.noShowResolved)))
        throw new ConflictError('NO_SHOW_ALREADY_DECIDED');
      return noShowDto(/** @type {any} */ (await NoShowRecord.findById(id).setOptions(SCOPE).lean()));
    },
    /** Windows over → FINAL; returns every final no-show not settled yet (for the orders module to settle). */
    async dueToSettle() {
      const now = deps.clock.now();
      for (const n of await NoShowRecord.find({ status: 'DISPUTE_WINDOW', disputeUntil: { $lte: now } })
        .setOptions(SCOPE)
        .limit(200)
        .lean())
        await move(n, 'DISPUTE_WINDOW', { status: 'FINAL' }, EVENTS.noShowResolved);
      return NoShowRecord.find({ status: 'FINAL', settled: false }).setOptions(SCOPE).limit(200).lean();
    },
    /** @param {string} id */
    markSettled: async (id) =>
      void (await NoShowRecord.updateOne({ _id: id, status: 'FINAL' }, { $set: { settled: true } }).setOptions(SCOPE)),
  };
}
