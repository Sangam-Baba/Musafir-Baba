// @ts-check
/**
 * Cancelling some or all seats of a bus booking (plan Stage 18 B7) — the bus side, as steps the orders module runs in
 * order for one cancellation (a `parts` entry with its own id; each step repeat-safe, the reconciler re-runs them):
 * 1. `partStart`: on a CONFIRMED booking with no other cancellation going on and none of the seats cancelled before →
 *    the part recorded PENDING and the seats marked cancelled (one conditional update — one wins);
 * 2. `partRelease`: the seats given back to the trip (bus-inventory, by the booking's claim);
 * 3. `partLedgerLines`: what the refund takes back from the confirmation's credits (pro rata, operator keeps its share);
 * 4. `partDone`: the part DONE (+ `bus-booking.booking.cancelled`); every seat cancelled → booking CANCELLED.
 */
import { newEvent } from '../../core/db/events.js';
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { partReversal } from './domain/cancel.js';
import { EVENTS } from './events.js';
import { BusBookingRecord } from './models/booking.model.js';
import { ENGINE } from './engine-scope.js';

/**
 * @typedef {import('./booking.service.js').BusEngineDeps} BusEngineDeps
 * @typedef {import('../orders/index.js').OrderItem} OrderItem
 * @typedef {{ id: string, seats: string[], kind: 'BUYER' | 'OPS', percent: number, chargePaise: number, refundPaise: number,
 *   operatorSharePaise: number, totals: import('./domain/cancel.js').PartTotals, by: string, reason: string | null }} Part
 */

/** @param {string} id */
async function load(id) {
  const b = /^[a-f0-9]{24}$/.test(id) ? await BusBookingRecord.findOne({ _id: id }).setOptions(ENGINE).lean() : null;
  if (!b) throw new NotFoundError('BUS_BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/** @param {Record<string, any>} b @param {string} partId */
const partOf = (b, partId) => b.parts.find((/** @type {any} */ p) => p.id === partId);

/** @param {BusEngineDeps} deps @param {OrderItem} item @param {Part} part */
async function partStart(deps, item, part) {
  const b = await load(item.bookingId);
  if (partOf(b, part.id)) return { started: true, status: 'PENDING' };
  const res = await BusBookingRecord.updateOne(
    { _id: b._id, status: 'CONFIRMED', 'parts.status': { $ne: 'PENDING' }, cancelledSeats: { $nin: part.seats } },
    {
      $push: {
        parts: { ...part, status: 'PENDING', at: deps.clock.now() },
        history: { at: deps.clock.now(), from: 'CONFIRMED', to: 'CONFIRMED', by: part.by, note: `cancelling ${part.seats.join(', ')}` },
      },
      $addToSet: { cancelledSeats: { $each: part.seats } },
    },
  ).setOptions(ENGINE);
  if (res.modifiedCount !== 1) throw new ConflictError('BOOKING_NOT_CANCELLABLE', { bookingStatus: b.status });
  return { started: true, status: 'PENDING' };
}

/** @param {BusEngineDeps} deps @param {OrderItem} item @param {string} partId */
async function partRelease(deps, item, partId) {
  const b = await load(item.bookingId);
  const p = partOf(b, partId);
  if (p?.status === 'PENDING' && b.claimId) await deps.claims.releaseSeats(b.claimId, p.seats);
}

/** @param {BusEngineDeps} deps @param {OrderItem} item @param {string} partId */
async function partLedgerLines(deps, item, partId) {
  const b = await load(item.bookingId);
  const p = partOf(b, partId);
  if (!p) return { refundPaise: 0, lines: [] };
  const lines = [];
  for (const l of partReversal(p.totals, p)) {
    const owner = l.type === 'OPERATOR_PAYABLE' ? b.operatorOrgId : 'platform';
    const accountId = await deps.ledger.accountId(owner, /** @type {any} */ (l.type));
    lines.push({ accountId, ...(l.debitPaise ? { debitPaise: l.debitPaise } : { creditPaise: l.creditPaise }) });
  }
  return { refundPaise: p.refundPaise, lines };
}

/** @param {BusEngineDeps} deps @param {OrderItem} item @param {string} partId */
async function partDone(deps, item, partId) {
  const b = await load(item.bookingId);
  const p = partOf(b, partId);
  if (!p || p.status === 'DONE') return;
  const all = b.cancelledSeats.length >= b.seats.length;
  const event = newEvent(
    EVENTS.bookingCancelled,
    {
      orgId: b.operatorOrgId,
      bookingId: String(b._id),
      ref: b.ref,
      orderId: b.orderId,
      tripId: b.tripId,
      seats: p.seats,
      refundPaise: p.refundPaise,
      kind: p.kind,
      all,
    },
    deps,
  );
  const now = deps.clock.now();
  await BusBookingRecord.updateOne(
    { _id: b._id, parts: { $elemMatch: { id: partId, status: 'PENDING' } } },
    {
      $set: {
        'parts.$[p].status': 'DONE',
        'parts.$[p].doneAt': now,
        hasPendingEvents: true,
        ...(all ? { status: 'CANCELLED', statusChangedAt: now } : {}),
      },
      $push: {
        pendingEvents: event,
        ...(all ? { history: { at: now, from: b.status, to: 'CANCELLED', by: p.by, note: p.reason ?? null } } : {}),
      },
    },
    { arrayFilters: [{ 'p.id': partId }] },
  ).setOptions(ENGINE);
}

/** @param {BusEngineDeps} deps */
export const partSteps = (deps) => ({
  /** @param {any} _ctx @param {OrderItem} item @param {Record<string, unknown>} part */
  partStart: (_ctx, item, part) => partStart(deps, item, /** @type {Part} */ (/** @type {unknown} */ (part))),
  /** @param {any} _ctx @param {OrderItem} item @param {string} partId */
  partRelease: (_ctx, item, partId) => partRelease(deps, item, partId),
  /** @param {OrderItem} item @param {string} partId */
  partLedgerLines: (item, partId) => partLedgerLines(deps, item, partId),
  /** @param {any} _ctx @param {OrderItem} item @param {string} partId */
  partDone: (_ctx, item, partId) => partDone(deps, item, partId),
});
