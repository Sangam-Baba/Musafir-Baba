// @ts-check
/**
 * Bus cancellations (plan Stage 18 B7):
 * - `quote` / `part`: cancelling some or all seats of a confirmed booking — buyers before the bus leaves their boarding
 *   stop, at the slabs the ticket was sold with; ops at any time with a full refund (the fee too when every seat goes);
 * - ops cancellations: one booking or a whole trip, full refund, two people (proposer ≠ approver). A trip is cancelled
 *   first (no new sales), then each confirmed booking is cancelled through the order engine (`cancelPart`, injected).
 */
import { randomUUID } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { DEFAULT_BUS_SLABS } from '../bus-catalog/index.js';
import { TripRecord } from '../bus-inventory/index.js';
import { partCharge, seatTotals } from './domain/cancel.js';
import { ENGINE } from './engine-scope.js';
import { BusBookingRecord } from './models/booking.model.js';
import { OpsCancellationRecord } from './models/ops-cancellation.model.js';

const OPS = systemScope('bus-booking: ops cancellations', { routine: true });

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   cancelPart: (orderId: string, bookingRef: string, part: Record<string, any>) => Promise<unknown> }} CancelDeps
 */

/**
 * The charge and refund of cancelling these seats now.
 * @param {CancelDeps['clock']} clock @param {Record<string, any>} b @param {string[]} seats @param {'BUYER' | 'OPS'} kind
 */
function quote(clock, b, seats, kind) {
  if (b.status !== 'CONFIRMED') throw new ConflictError('BOOKING_NOT_CANCELLABLE', { bookingStatus: b.status });
  const mine = b.seats.map((/** @type {any} */ s) => s.no);
  const left = mine.filter((/** @type {string} */ no) => !(b.cancelledSeats ?? []).includes(no));
  if (!seats.length || new Set(seats).size !== seats.length || seats.some((s) => !left.includes(s)))
    throw new DomainError('SEATS_NOT_CANCELLABLE', { left });
  const now = clock.now();
  if (kind === 'BUYER' && new Date(b.from.at).getTime() <= now.getTime()) throw new ConflictError('TRIP_DEPARTED');
  const totals = seatTotals(b.price, seats, kind === 'OPS' && seats.length === left.length);
  const slabs = b.cancellationPolicy?.slabs ?? [...DEFAULT_BUS_SLABS];
  return {
    seats,
    totals,
    ...partCharge({ slabs, departAt: new Date(b.from.at), now, totals, waive: kind === 'OPS' }),
    policy: b.cancellationPolicy?.summary ?? null,
  };
}

/**
 * A cancellation ready for the order engine — exactly the fields a booking keeps.
 * @param {ReturnType<typeof quote>} q @param {{ kind: 'BUYER' | 'OPS', by: string, reason: string | null }} a
 */
const toPart = (q, a) => ({
  id: randomUUID(),
  seats: q.seats,
  kind: a.kind,
  percent: q.percent,
  chargePaise: q.chargePaise,
  refundPaise: q.refundPaise,
  operatorSharePaise: q.operatorSharePaise,
  totals: q.totals,
  by: a.by,
  reason: a.reason,
});

/** @param {string} ref */
async function byRef(ref) {
  const b = await BusBookingRecord.findOne({ ref }).setOptions(ENGINE).lean();
  if (!b) throw new NotFoundError('BUS_BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/** Every confirmed booking of a cancelled trip, each with all its seats left, full refund. @param {CancelDeps} deps @param {Record<string, any>} a */
async function runOps(deps, a) {
  const bookings =
    a.scope === 'BOOKING'
      ? [await byRef(a.bookingRef)]
      : await BusBookingRecord.find({ tripId: a.tripId, status: 'CONFIRMED' }).setOptions(ENGINE).lean();
  if (a.scope === 'TRIP')
    await TripRecord.updateOne(
      { _id: a.tripId, status: 'SCHEDULED' },
      { $set: { status: 'CANCELLED', cancelReason: 'OPS_CANCELLED' } },
    ).setOptions(OPS);
  const results = [];
  for (const b of bookings) {
    try {
      const left = b.seats.map((/** @type {any} */ s) => s.no).filter((/** @type {string} */ no) => !(b.cancelledSeats ?? []).includes(no));
      const q = quote(deps.clock, b, left, 'OPS');
      await deps.cancelPart(b.orderId, b.ref, toPart(q, { kind: 'OPS', by: a.decidedBy, reason: a.reason }));
      results.push({ bookingRef: b.ref, refundPaise: q.refundPaise, error: null });
    } catch (e) {
      results.push({ bookingRef: b.ref, refundPaise: 0, error: String(/** @type {any} */ (e)?.code ?? 'FAILED') });
    }
  }
  return results;
}

/** @param {CancelDeps} deps */
export function createBusCancellations(deps) {
  return {
    /** @param {Record<string, any>} b @param {string[]} seats */
    quote: (b, seats) => quote(deps.clock, b, seats, 'BUYER'),
    /** A buyer's cancellation, ready for the order engine. @param {Record<string, any>} b @param {string[]} seats @param {string} by */
    buyerPart: (b, seats, by) => toPart(quote(deps.clock, b, seats, 'BUYER'), { kind: 'BUYER', by, reason: null }),
    byRef,
    /** @param {string} by @param {{ scope: 'BOOKING' | 'TRIP', bookingRef?: string | null, tripId?: string | null, reason: string }} a */
    async propose(by, a) {
      const operatorOrgId =
        a.scope === 'BOOKING'
          ? (await byRef(String(a.bookingRef))).operatorOrgId
          : (await TripRecord.findOne({ _id: a.tripId }, { operatorOrgId: 1 }).setOptions(OPS).lean())?.operatorOrgId;
      if (!operatorOrgId) throw new NotFoundError('TRIP_NOT_FOUND');
      const doc = await OpsCancellationRecord.create({
        ...a,
        bookingRef: a.bookingRef ?? null,
        tripId: a.tripId ?? null,
        operatorOrgId,
        status: 'PROPOSED',
        proposedBy: by,
      });
      return doc.toObject();
    },
    /** A second person approves (runs it once) or rejects. @param {string} by @param {string} id @param {boolean} approve */
    async decide(by, id, approve) {
      const a = /^[a-f0-9]{24}$/.test(id) ? await OpsCancellationRecord.findById(id).lean() : null;
      if (!a) throw new NotFoundError('CANCELLATION_NOT_FOUND');
      if (a.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
      const won = await OpsCancellationRecord.findOneAndUpdate(
        { _id: id, status: 'PROPOSED' },
        { $set: { status: approve ? 'DONE' : 'REJECTED', decidedBy: by, decidedAt: deps.clock.now() } },
        { new: true },
      ).lean();
      if (!won) throw new ConflictError('CANCELLATION_ALREADY_DECIDED');
      if (!approve) return won;
      const results = await runOps(deps, won);
      await OpsCancellationRecord.updateOne({ _id: id }, { $set: { results } });
      return { ...won, results };
    },
    /** @param {{ status?: string }} q */
    list: async (q) =>
      OpsCancellationRecord.find({ status: q.status ?? 'PROPOSED' })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
  };
}
