// @ts-check
/**
 * Cancelling a hotel booking (plan Stage 09 §3.4) — the hotel side, as item-handler steps the orders module runs in
 * order (each repeat-safe; the reconciler re-runs them for a booking stuck in CANCELLING):
 * 1. `cancelStart`: CONFIRMED → CANCELLING with the quote's charge / refund and the hotel's share (one wins at once);
 * 2. `cancelRooms`: the booking's nights given back (hotel-inventory `returnRooms`, by booking id — once);
 * 3. `cancelLedgerLines`: what the cancellation takes back from the confirmation's credits (D5 pro rata);
 * 4. `cancelDone`: CANCELLING → CANCELLED (+ `hotel-booking.booking.cancelled`), the cancellation record completed.
 */
import { systemContext } from '../../core/context.js';
import { ConflictError } from '../../core/errors.js';
import { ENGINE, loadBooking, moveBooking } from './booking-steps.js';
import { holdLinesOf } from './domain/booking.js';
import { cancellationReversal, splitCharge } from './domain/cancellation-charge.js';
import { EVENTS } from './events.js';
import { CancellationRecord } from './models/cancellation.model.js';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger,
 *   holds: ReturnType<typeof import('../hotel-inventory/index.js').createHoldService>,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger> }} CancelDeps
 * @typedef {import('../orders/index.js').OrderItem} OrderItem
 */

/**
 * @param {CancelDeps} deps
 * @param {OrderItem} item
 * @param {{ chargePaise: number, refundPaise: number, by: string, reason?: string | null }} q
 */
async function cancelStart(deps, item, q) {
  const b = await loadBooking(item.bookingId);
  if (b.status === 'CANCELLING' || b.status === 'CANCELLED') return { started: false, status: b.status };
  if (b.status !== 'CONFIRMED') throw new ConflictError('BOOKING_NOT_CANCELLABLE', { bookingStatus: b.status });
  const now = deps.clock.now();
  const { hotelPaise } = splitCharge({
    chargePaise: q.chargePaise,
    totalPaise: b.totalPaise,
    hotelPayablePaise: b.price.totals.hotelPayablePaise,
  });
  const cancellation = {
    chargePaise: q.chargePaise,
    refundPaise: q.refundPaise,
    hotelSharePaise: hotelPaise,
    requestedBy: q.by,
    requestedAt: now,
    reason: q.reason ?? null,
  };
  const moved = await moveBooking(deps, b, {
    from: 'CONFIRMED',
    to: 'CANCELLING',
    by: q.by,
    set: { cancellation },
    note: q.reason ?? undefined,
  });
  if (!moved) throw new ConflictError('BOOKING_NOT_CANCELLABLE', { bookingStatus: (await loadBooking(item.bookingId)).status });
  await CancellationRecord.updateOne(
    { bookingId: String(b._id) },
    {
      $setOnInsert: {
        bookingId: String(b._id),
        bookingRef: b.ref,
        orderId: b.orderId,
        orderRef: b.orderRef,
        hotelOrgId: b.hotelOrgId,
        ...cancellation,
        status: 'CANCELLING',
      },
    },
    { upsert: true },
  ).setOptions(ENGINE);
  return { started: true, status: 'CANCELLING' };
}

/** @param {CancelDeps} deps @param {OrderItem} item */
async function cancelRooms(deps, item) {
  const b = await loadBooking(item.bookingId);
  if (b.status !== 'CANCELLING') return;
  const ctx = systemContext('hotel-booking: give back a cancelled booking', `cancel-${String(b._id)}`, deps.logger, deps.clock);
  await deps.holds.returnRooms(ctx, { bookingId: String(b._id), lines: holdLinesOf(b.stay, b.stay.nights) });
}

/** @param {CancelDeps} deps @param {OrderItem} item */
async function cancelLedgerLines(deps, item) {
  const b = await loadBooking(item.bookingId);
  const c = b.cancellation;
  if (!c) return { refundPaise: 0, lines: [] };
  await deps.ledger.openHotelPayable(b.hotelOrgId);
  const lines = [];
  for (const l of cancellationReversal(b.price.totals, c)) {
    const accountId = await deps.ledger.accountId(l.type === 'PAYABLE' ? b.hotelOrgId : 'platform', l.type);
    lines.push({ accountId, ...(l.debitPaise ? { debitPaise: l.debitPaise } : { creditPaise: l.creditPaise }) });
  }
  return { refundPaise: c.refundPaise, lines };
}

/** @param {CancelDeps} deps @param {OrderItem} item */
async function cancelDone(deps, item) {
  const b = await loadBooking(item.bookingId);
  if (b.status === 'CANCELLED') return;
  await moveBooking(deps, b, { from: 'CANCELLING', to: 'CANCELLED', by: 'system:orders', event: EVENTS.bookingCancelled });
  await CancellationRecord.updateOne(
    { bookingId: String(b._id), status: 'CANCELLING' },
    { $set: { status: 'CANCELLED', completedAt: deps.clock.now() } },
  ).setOptions(ENGINE);
}

/** @param {CancelDeps} deps */
export function cancelSteps(deps) {
  return {
    /** @param {unknown} _ctx @param {OrderItem} item @param {{ chargePaise: number, refundPaise: number, by: string, reason?: string | null }} q */
    cancelStart: (_ctx, item, q) => cancelStart(deps, item, q),
    /** @param {unknown} _ctx @param {OrderItem} item */
    cancelRooms: (_ctx, item) => cancelRooms(deps, item),
    /** @param {OrderItem} item */
    cancelLedgerLines: (item) => cancelLedgerLines(deps, item),
    /** @param {unknown} _ctx @param {OrderItem} item */
    cancelDone: (_ctx, item) => cancelDone(deps, item),
  };
}
