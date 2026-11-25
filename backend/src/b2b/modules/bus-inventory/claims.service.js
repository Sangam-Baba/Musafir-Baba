// @ts-check
/**
 * Seat claims (plan Stage 18 B4, §5): an operator's counter **block** and a buyer's **hold** (used by the booking engine
 * in B6). Flow (P1–P5): the claim document is written first (TAKING) → seats taken one by one with its id (all or
 * nothing) → the trip is checked again (still running, not departed at the boarding stop, sale open for holds) → ACTIVE.
 * Release: ACTIVE / CONFIRMED → RELEASING → seats given back → RELEASED. The sweeper finishes every middle status.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { journeyLegs } from './domain/seats.js';
import { ClaimRecord } from './models/claim.model.js';
import { TripSeatRecord } from './models/trip-seat.model.js';
import { TripRecord } from './models/trip.model.js';
import { confirmSeats, giveBackSeats, takeSeats } from './seat-steps.js';

export const HOLD_MINUTES = 15;
export const EXTEND_MINUTES = 10;
const STUCK_MS = 2 * 60_000;
const MAX_HOLD_SEATS = 10;
const SCOPE = systemScope('bus-inventory: seat claims', { routine: true });

/** @typedef {{ clock: import('../../core/clock.js').Clock }} ClaimDeps */
/** @typedef {{ orgId: string, userId: string }} Operator */
/**
 * @typedef {{ trip: Record<string, any>, kind: 'HOLD' | 'BLOCK', seats: string[], fromStopId?: string | null,
 *   toStopId?: string | null, ladiesOk: string[], by: string, note?: string | null }} ClaimInput
 */

/** @param {Record<string, any>} c */
export const claimDto = (c) => ({
  id: String(c._id),
  tripId: c.tripId,
  kind: c.kind,
  seats: c.seats,
  fromIdx: c.fromIdx,
  toIdx: c.toIdx,
  status: c.status,
  expiresAt: c.expiresAt,
  by: c.by,
  note: c.note,
  createdAt: c.createdAt,
});

/** Why seats can't be taken on this trip now (null = fine). @param {Record<string, any> | null} trip @param {'HOLD' | 'BLOCK'} kind @param {number} fromIdx @param {Date} now */
function tripProblem(trip, kind, fromIdx, now) {
  if (!trip) return 'TRIP_NOT_FOUND';
  if (trip.status !== 'SCHEDULED') return 'TRIP_CANCELLED';
  if (!trip.seatsReady) return 'TRIP_NOT_READY';
  if (new Date(trip.stops[fromIdx]?.at).getTime() <= now.getTime()) return 'TRIP_DEPARTED';
  if (kind === 'HOLD' && trip.saleStopped) return 'SALE_STOPPED';
  return null;
}

/** Why a seat couldn't be taken, in words a buyer understands. @param {string} tripId @param {string} no @param {string[]} ladiesOk */
async function seatProblem(tripId, no, ladiesOk) {
  const seat = await TripSeatRecord.findOne({ tripId, no }, { ladies: 1 }).setOptions(SCOPE).lean();
  if (!seat) return 'SEAT_NOT_FOUND';
  return seat.ladies && !ladiesOk.includes(no) ? 'LADIES_SEAT' : 'SEAT_UNAVAILABLE';
}

/** @param {string} id @param {string} failure */
const fail = (id, failure) =>
  ClaimRecord.updateOne({ _id: id, status: 'TAKING' }, { $set: { status: 'FAILED', failure } }).setOptions(SCOPE);

/** Take the seats for a claim (all or nothing). @param {ClaimDeps} deps @param {ClaimInput} a */
async function claim(deps, a) {
  const seats = [...new Set(a.seats)];
  const legs = journeyLegs(a.trip.stops, a.fromStopId, a.toStopId);
  if (!legs.ok) throw new DomainError(legs.code);
  const now = deps.clock.now();
  const before = tripProblem(a.trip, a.kind, legs.fromIdx, now);
  if (before) throw new ConflictError(before);
  const tripId = String(a.trip._id);
  const doc = await ClaimRecord.create({
    operatorOrgId: a.trip.operatorOrgId,
    tripId,
    kind: a.kind,
    seats,
    fromIdx: legs.fromIdx,
    toIdx: legs.toIdx,
    mask: legs.mask,
    expiresAt: a.kind === 'HOLD' ? new Date(now.getTime() + HOLD_MINUTES * 60_000) : null,
    by: a.by,
    note: a.note ?? null,
  });
  const ref = String(doc._id);
  const took = await takeSeats({ tripId, ref, kind: a.kind, mask: legs.mask, at: now }, seats, a.ladiesOk);
  if (!took.ok) {
    const code = await seatProblem(tripId, took.seat, a.ladiesOk);
    await fail(ref, code);
    throw new ConflictError(code, { seat: took.seat });
  }
  const after = tripProblem(await TripRecord.findOne({ _id: tripId }).setOptions(SCOPE).lean(), a.kind, legs.fromIdx, deps.clock.now());
  if (after) {
    await giveBackSeats(tripId, seats, ref);
    await fail(ref, after);
    throw new ConflictError(after);
  }
  const res = await ClaimRecord.updateOne({ _id: ref, status: 'TAKING' }, { $set: { status: 'ACTIVE' } }).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('CLAIM_EXPIRED'); // the sweeper took over and gives the seats back
  return claimDto({ ...doc.toObject(), status: 'ACTIVE' });
}

/** ACTIVE / CONFIRMED → RELEASING → seats back → RELEASED. @param {Record<string, unknown>} filter */
async function release(filter) {
  const c = await ClaimRecord.findOneAndUpdate(
    { ...filter, status: { $in: ['ACTIVE', 'CONFIRMED'] } },
    { $set: { status: 'RELEASING' } },
    { new: true },
  )
    .setOptions(SCOPE)
    .lean();
  if (!c) return null;
  await giveBackSeats(c.tripId, c.seats, String(c._id));
  await ClaimRecord.updateOne({ _id: c._id, status: 'RELEASING' }, { $set: { status: 'RELEASED' } }).setOptions(SCOPE);
  return claimDto({ ...c, status: 'RELEASED' });
}

/** Moves every claim left in a middle status forward (repeat-safe). @param {ClaimDeps} deps */
async function sweep(deps) {
  const now = deps.clock.now();
  const expired = await ClaimRecord.updateMany(
    {
      $or: [
        { kind: 'HOLD', status: 'ACTIVE', expiresAt: { $lte: now } },
        { status: 'TAKING', createdAt: { $lte: new Date(now.getTime() - STUCK_MS) } },
      ],
    },
    { $set: { status: 'RELEASING' } },
  ).setOptions(SCOPE);
  let released = 0;
  for (const c of await ClaimRecord.find({ status: 'RELEASING' }).setOptions(SCOPE).limit(500).lean()) {
    await giveBackSeats(c.tripId, c.seats, String(c._id));
    released += (await ClaimRecord.updateOne({ _id: c._id, status: 'RELEASING' }, { $set: { status: 'RELEASED' } }).setOptions(SCOPE))
      .modifiedCount;
  }
  for (const c of await ClaimRecord.find({ status: 'CONFIRMED', seatsConfirmed: false }).setOptions(SCOPE).limit(500).lean()) {
    await confirmSeats(c.tripId, String(c._id));
    await ClaimRecord.updateOne({ _id: c._id }, { $set: { seatsConfirmed: true } }).setOptions(SCOPE);
  }
  return { expired: expired.modifiedCount, released };
}

/** @param {string} orgId @param {string} tripId */
async function ownTrip(orgId, tripId) {
  const t = /^[a-f0-9]{24}$/.test(tripId) ? await TripRecord.findOne({ _id: tripId, operatorOrgId: orgId }).lean() : null;
  if (!t) throw new NotFoundError('TRIP_NOT_FOUND');
  return /** @type {Record<string, any>} */ (t);
}

/** Once, while paying: the hold lasts `EXTEND_MINUTES` longer. @param {string} id */
async function extendHold(id) {
  const c = await ClaimRecord.findOneAndUpdate(
    { _id: id, kind: 'HOLD', status: 'ACTIVE', extended: false },
    [{ $set: { extended: true, expiresAt: { $add: ['$expiresAt', EXTEND_MINUTES * 60_000] } } }],
    { new: true },
  )
    .setOptions(SCOPE)
    .lean();
  if (!c) throw new ConflictError('HOLD_NOT_EXTENDABLE');
  return /** @type {Date} */ (c.expiresAt);
}

/** Paid → the hold becomes a booking (seats stay). @param {string} id */
async function confirmHold(id) {
  const c = await ClaimRecord.findOneAndUpdate(
    { _id: id, kind: 'HOLD', status: 'ACTIVE' },
    { $set: { status: 'CONFIRMED' } },
    { new: true },
  )
    .setOptions(SCOPE)
    .lean();
  if (!c) throw new ConflictError('HOLD_NOT_ACTIVE');
  await confirmSeats(c.tripId, id);
  await ClaimRecord.updateOne({ _id: id }, { $set: { seatsConfirmed: true } }).setOptions(SCOPE);
  return claimDto(c);
}

/** @param {ClaimDeps} deps */
export function createClaims(deps) {
  return {
    /** Counter block by the operator (any seat, ladies-only too). @param {Operator} who @param {string} tripId @param {{ seats: string[], fromStopId?: string | null, toStopId?: string | null, note?: string | null }} a */
    async block(who, tripId, a) {
      const trip = await ownTrip(who.orgId, tripId);
      return claim(deps, {
        trip,
        kind: 'BLOCK',
        seats: a.seats,
        fromStopId: a.fromStopId,
        toStopId: a.toStopId,
        ladiesOk: a.seats,
        by: `user:${who.userId}`,
        note: a.note,
      });
    },
    /** @param {Operator} who @param {string} id */
    async releaseBlock(who, id) {
      const done = /^[a-f0-9]{24}$/.test(id) ? await release({ _id: id, operatorOrgId: who.orgId, kind: 'BLOCK' }) : null;
      if (!done) throw new NotFoundError('BLOCK_NOT_FOUND');
      return done;
    },
    /**
     * A buyer's hold (booking engine, B6): seats for a journey, ladies-only seats only for women passengers.
     * @param {{ tripId: string, seats: string[], fromStopId: string, toStopId: string, ladiesOk: string[], by: string }} a
     */
    async hold(a) {
      if (!a.seats.length || a.seats.length > MAX_HOLD_SEATS) throw new DomainError('SEAT_COUNT_INVALID');
      const trip = /^[a-f0-9]{24}$/.test(a.tripId) ? await TripRecord.findOne({ _id: a.tripId }).setOptions(SCOPE).lean() : null;
      if (!trip) throw new NotFoundError('TRIP_NOT_FOUND');
      return claim(deps, { trip, kind: 'HOLD', ...a });
    },
    /** The active hold an order took (for giving back an unfinished checkout). @param {string} by */
    activeHoldBy: async (by) => ClaimRecord.findOne({ kind: 'HOLD', status: 'ACTIVE', by }).setOptions(SCOPE).lean(),
    /** Some seats of a confirmed claim given back (a partial cancellation; repeat-safe). @param {string} id @param {string[]} seats */
    async releaseSeats(id, seats) {
      const c = await ClaimRecord.findOne({ _id: id }).setOptions(SCOPE).lean();
      if (!c) return;
      await giveBackSeats(c.tripId, seats, id);
      await ClaimRecord.updateOne({ _id: id }, { $pull: { seats: { $in: seats } } }).setOptions(SCOPE);
    },
    /** Give back a hold (not paid) or a booking's seats (cancelled). @param {string} id */
    releaseHold: (id) => release({ _id: id, kind: 'HOLD' }),
    extend: extendHold,
    confirm: confirmHold,
    sweep: () => sweep(deps),
    /** Active counter blocks on a trip. @param {string} orgId @param {string} tripId */
    async blocksOf(orgId, tripId) {
      await ownTrip(orgId, tripId);
      return (await ClaimRecord.find({ tripId, operatorOrgId: orgId, kind: 'BLOCK', status: 'ACTIVE' }).sort({ createdAt: 1 }).lean()).map(
        claimDto,
      );
    },
    /** Stop / restart online sale of a trip (counter blocks still work). @param {Operator} who @param {string} tripId @param {boolean} stopped */
    async setSale(who, tripId, stopped) {
      await ownTrip(who.orgId, tripId);
      await TripRecord.updateOne({ _id: tripId, operatorOrgId: who.orgId }, { $set: { saleStopped: stopped } });
      return { tripId, saleStopped: stopped };
    },
  };
}
