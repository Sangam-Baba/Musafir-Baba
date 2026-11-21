// @ts-check
/**
 * When a hotel can't honour a confirmed booking (plan Stage 09 §3.7):
 * - reported by the hotel (`hotel-booking.booking.cannotHonour`, own property) or MusafirBaba → booking HOTEL_FAILED
 *   (its rooms stay out of sale — the hotel didn't really have them), the buyer is told, MusafirBaba's queue gets it;
 * - MusafirBaba resolves: REFUND (everything back to the buyer; the order cancelled) or RELOCATE (the team booked another
 *   hotel; what the first hotel was owed moves to suspense for finance to settle). The money moves in the orders module.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { authz } from '../access/index.js';
import { ENGINE, moveBooking } from './booking-steps.js';
import { EVENTS } from './events.js';
import { BookingRecord } from './models/booking.model.js';
import { HotelFailureRecord } from './models/hotel-failure.model.js';
import { PERMISSIONS } from './permissions.js';

const SCOPE = systemScope('hotel-booking: hotel failures', { routine: true });

/** @typedef {{ clock: import('../../core/clock.js').Clock }} FailureDeps */

/** @param {Record<string, any>} f */
export const failureDto = (f) => ({
  id: String(f._id),
  bookingRef: f.bookingRef,
  orderRef: f.orderRef,
  hotelOrgId: f.hotelOrgId,
  reportedBy: f.reportedBy,
  reportedAt: f.reportedAt,
  reason: f.reason,
  status: f.status,
  resolution: f.resolution,
  settled: f.settled,
});

/** @param {FailureDeps} deps @param {Record<string, any>} f @param {string} type */
const eventOf = (deps, f, type) =>
  newEvent(
    type,
    {
      orgId: f.hotelOrgId,
      failureId: String(f._id),
      bookingId: f.bookingId,
      bookingRef: f.bookingRef,
      orderId: f.orderId,
      ref: f.orderRef,
      status: f.status,
    },
    deps,
  );

/**
 * @param {FailureDeps} deps
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {string} ref
 * @param {string} reason
 */
async function report(deps, ctx, ref, reason) {
  const canonical = parseReference(ref);
  const b = /** @type {any} */ (
    canonical?.startsWith('MBH-') ? await BookingRecord.findOne({ ref: canonical }).setOptions(ENGINE).lean() : null
  );
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  if (ctx.actor.type === 'member') authz.assert(ctx, PERMISSIONS.bookingCannotHonour, { orgId: b.hotelOrgId, propertyId: b.propertyId });
  if (b.status !== 'CONFIRMED') throw new ConflictError('BOOKING_NOT_CONFIRMED', { bookingStatus: b.status });
  const by =
    ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : ctx.actor.type === 'staff' ? `staff:${ctx.actor.staffId}` : 'system';
  if (!(await moveBooking(deps, b, { from: 'CONFIRMED', to: 'HOTEL_FAILED', by, note: reason })))
    throw new ConflictError('BOOKING_NOT_CONFIRMED');
  const f = /** @type {any} */ (
    (
      await HotelFailureRecord.create({
        bookingId: String(b._id),
        bookingRef: b.ref,
        orderId: b.orderId,
        orderRef: b.orderRef,
        hotelOrgId: b.hotelOrgId,
        propertyId: b.propertyId,
        reportedBy: by,
        reportedAt: deps.clock.now(),
        reason: reason.trim(),
        status: 'OPEN',
      })
    ).toObject()
  );
  await HotelFailureRecord.updateOne(
    { _id: f._id },
    { $set: { hasPendingEvents: true }, $push: { pendingEvents: eventOf(deps, f, EVENTS.hotelFailed) } },
  ).setOptions(SCOPE);
  return failureDto(f);
}

/**
 * MusafirBaba decides. For a refund the booking keeps a cancellation copy (nothing charged, everything refunded) so the
 * buyer's page and email show it.
 * @param {FailureDeps} deps
 * @param {string} by
 * @param {string} id
 * @param {{ action: 'REFUND' | 'RELOCATE', note: string, alternativeRef?: string | null }} d
 */
async function resolve(deps, by, id, d) {
  const f = /^[a-f0-9]{24}$/.test(id) ? await HotelFailureRecord.findById(id).setOptions(SCOPE).lean() : null;
  if (!f) throw new NotFoundError('HOTEL_FAILURE_NOT_FOUND');
  const status = d.action === 'REFUND' ? 'REFUNDED' : 'RELOCATED';
  const resolution = { at: deps.clock.now(), by, action: d.action, note: d.note.trim(), alternativeRef: d.alternativeRef?.trim() || null };
  const res = await HotelFailureRecord.updateOne(
    { _id: f._id, status: 'OPEN' },
    {
      $set: { status, resolution, hasPendingEvents: true },
      $push: { pendingEvents: eventOf(deps, { ...f, status }, EVENTS.hotelFailureResolved) },
    },
  ).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('HOTEL_FAILURE_ALREADY_RESOLVED');
  if (d.action === 'REFUND') {
    const b = /** @type {any} */ (await BookingRecord.findOne({ _id: f.bookingId }).setOptions(ENGINE).lean());
    await BookingRecord.updateOne(
      { _id: f.bookingId, cancellation: null },
      {
        $set: {
          cancellation: {
            chargePaise: 0,
            refundPaise: b.totalPaise,
            hotelSharePaise: 0,
            requestedBy: by,
            requestedAt: deps.clock.now(),
            reason: `Hotel couldn't honour: ${f.reason}`.slice(0, 500),
          },
        },
      },
    ).setOptions(ENGINE);
  }
  return failureDto(/** @type {any} */ (await HotelFailureRecord.findById(id).setOptions(SCOPE).lean()));
}

/** @param {FailureDeps} deps */
export function createHotelFailures(deps) {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} ref @param {string} reason */
    report: (ctx, ref, reason) => report(deps, ctx, ref, reason),
    /** @param {{ status?: string }} q */
    list: async (q) =>
      (
        await HotelFailureRecord.find(q.status ? { status: q.status } : { status: 'OPEN' })
          .setOptions(SCOPE)
          .sort({ reportedAt: 1 })
          .limit(200)
          .lean()
      ).map(failureDto),
    /** @param {string} by @param {string} id @param {{ action: 'REFUND' | 'RELOCATE', note: string, alternativeRef?: string | null }} d */
    resolve: (by, id, d) => resolve(deps, by, id, d),
    /** Resolved but the money not moved yet (the orders module settles, then `markSettled`). */
    dueToSettle: () =>
      HotelFailureRecord.find({ status: { $in: ['REFUNDED', 'RELOCATED'] }, settled: false })
        .setOptions(SCOPE)
        .limit(200)
        .lean(),
    /** @param {string} id */
    markSettled: async (id) => void (await HotelFailureRecord.updateOne({ _id: id }, { $set: { settled: true } }).setOptions(SCOPE)),
  };
}
