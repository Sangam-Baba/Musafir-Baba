// @ts-check
/**
 * The BUS item handler of the booking engine (plan Stage 18 B6, ADR-0016 / 0017). Orders call it through the
 * item-handler interface; it never calls orders back. Same rules as hotel bookings:
 * - `price`: passengers checked, the seats priced by the server now (never the browser's amount); the buyer's expected
 *   total differs → PRICE_CHANGED (nothing taken);
 * - `prepare`: the seats held through bus-inventory (one 15-minute hold, ladies seats only for women) → booking `HELD`
 *   with the breakdown as sold (the price lock);
 * - `confirm`: hold → BOOKING entries → booking `CONFIRMED` (+ event) — or the reason it can't (seats lost);
 * - `rehold` (paid late), `release`, `extend` (once), `abandon`, and the ledger lines of a confirmed booking:
 *   Cr bus company payable (net fares) · GST payable · MusafirBaba margin.
 * Every step is one conditional single-document update and repeat-safe. Cancellations come in B7.
 */
import { createHash } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { newEvent } from '../../core/db/events.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';
import { newReference } from '../../core/ids.js';
import { busPriceView } from './domain/price.js';
import { checkPassengers, ladiesOkSeats } from './domain/passengers.js';
import { EVENTS } from './events.js';
import { BusBookingRecord } from './models/booking.model.js';

export const ENGINE = systemScope('bus-booking: booking engine', { routine: true });

/**
 * @typedef {import('../orders/index.js').ItemHandler} ItemHandler
 * @typedef {import('../orders/index.js').OrderInfo} OrderInfo
 * @typedef {import('../orders/index.js').OrderItem} OrderItem
 * @typedef {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger,
 *   search: ReturnType<typeof import('./search.service.js').createBusSearch>,
 *   claims: ReturnType<typeof import('../bus-inventory/index.js').createClaims>,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger> }} BusEngineDeps
 * @typedef {{ caller: { channel: 'WEBSITE' | 'B2B_PORTAL' | 'B2B_API', clientOrgId: string | null, clientCategory: string | null },
 *   tripId: string, fromStopId: string, toStopId: string, expectedTotalPaise?: number | null,
 *   seats: import('./domain/passengers.js').SeatPassenger[] }} BusItemInput
 */

/** @param {string} id */
async function loadBooking(id) {
  const b = /^[a-f0-9]{24}$/.test(id) ? await BusBookingRecord.findOne({ _id: id }).setOptions(ENGINE).lean() : null;
  if (!b) throw new NotFoundError('BUS_BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/**
 * One conditional status move with its history line (and events). False when the booking wasn't in `from`.
 * @param {BusEngineDeps} deps
 * @param {Record<string, any>} b
 * @param {{ from: string | string[], to: string, by: string, set?: Record<string, unknown>, note?: string | null, events?: any[] }} m
 */
async function move(deps, b, m) {
  const now = deps.clock.now();
  const events = m.events ?? [];
  const res = await BusBookingRecord.updateOne(
    { _id: b._id, status: { $in: [m.from].flat() } },
    {
      $set: { status: m.to, statusChangedAt: now, ...(m.set ?? {}), ...(events.length ? { hasPendingEvents: true } : {}) },
      $push: {
        history: { at: now, from: b.status, to: m.to, by: m.by, note: m.note ?? null },
        ...(events.length ? { pendingEvents: { $each: events } } : {}),
      },
    },
  ).setOptions(ENGINE);
  return res.modifiedCount === 1;
}

/** @param {BusEngineDeps} deps @param {BusItemInput} input */
async function price(deps, input) {
  const problems = checkPassengers(input.seats);
  if (problems.length) throw new ValidationError({ problems });
  const q = await deps.search.quote({
    tripId: input.tripId,
    fromStopId: input.fromStopId,
    toStopId: input.toStopId,
    seats: input.seats.map((s) => ({ no: s.no, gender: s.passenger.gender })),
    caller: input.caller,
  });
  const totalPaise = q.breakdown.totals.totalPaise;
  if (typeof input.expectedTotalPaise === 'number' && input.expectedTotalPaise !== totalPaise)
    throw new ConflictError('PRICE_CHANGED', { quotedTotalPaise: input.expectedTotalPaise, totalPaise });
  const key = [input.tripId, input.fromStopId, input.toStopId, ...input.seats.map((s) => s.no).sort()].join('|');
  return {
    totalPaise,
    gstPaise: q.breakdown.totals.gstPaise,
    supplierOrgId: q.trip.operatorOrgId,
    tokenHash: createHash('sha256').update(`bus:${key}`).digest('base64url').slice(0, 32),
    data: { q, input },
  };
}

/**
 * The booking document a prepared order inserts (once per order).
 * @param {BusEngineDeps} deps
 * @param {{ order: OrderInfo, q: any, input: BusItemInput, claimId: string }} a
 */
function newBooking(deps, { order, q, input, claimId }) {
  const passengers = new Map(input.seats.map((s) => [s.no, s.passenger]));
  return {
    ref: newReference('MBB'),
    orderId: order.id,
    orderRef: order.ref,
    channel: order.channel,
    operatorOrgId: q.trip.operatorOrgId,
    ...order.buyer,
    tripId: String(q.trip._id),
    routeId: q.trip.routeId,
    vehicleId: q.trip.vehicleId,
    date: q.trip.date,
    from: q.from,
    to: q.to,
    seats: q.seats.map((/** @type {any} */ s) => {
      const p = /** @type {any} */ (passengers.get(s.no));
      return { no: s.no, seatType: s.seatType, deck: s.deck, passenger: { name: p.name.trim(), age: p.age, gender: p.gender } };
    }),
    contact: order.contact,
    claimId,
    claimIds: [claimId],
    price: q.breakdown,
    totalPaise: q.breakdown.totals.totalPaise,
    gstPaise: q.breakdown.totals.gstPaise,
    snapshot: q.snapshot,
    status: 'HELD',
    statusChangedAt: deps.clock.now(),
  };
}

/** @param {BusEngineDeps} deps @param {OrderInfo} order @param {any} priced */
async function prepare(deps, order, priced) {
  const { q, input } = priced.data;
  const claim = await deps.claims.hold({
    tripId: input.tripId,
    seats: input.seats.map((/** @type {any} */ s) => s.no),
    fromStopId: input.fromStopId,
    toStopId: input.toStopId,
    ladiesOk: ladiesOkSeats(input.seats),
    by: `order:${order.id}`,
  });
  const b = await BusBookingRecord.findOneAndUpdate(
    { orderId: order.id },
    {
      $setOnInsert: newBooking(deps, { order, q, input, claimId: claim.id }),
    },
    { upsert: true, new: true },
  )
    .setOptions(ENGINE)
    .lean();
  const booking = /** @type {Record<string, any>} */ (b);
  return {
    item: {
      type: 'BUS',
      bookingId: String(booking._id),
      bookingRef: booking.ref,
      hotelOrgId: null,
      supplierOrgId: booking.operatorOrgId,
      holdId: booking.claimId,
      totalPaise: booking.totalPaise,
      gstPaise: booking.gstPaise,
    },
    holdExpiresAt: new Date(claim.expiresAt),
  };
}

/** @param {BusEngineDeps} deps @param {OrderItem} item */
async function confirm(deps, item) {
  const b = await loadBooking(item.bookingId);
  if (b.status === 'CONFIRMED') return /** @type {const} */ ({ confirmed: true });
  if (b.status !== 'HELD') return /** @type {const} */ ({ confirmed: false, reason: 'SEATS_LOST' });
  try {
    await deps.claims.confirm(b.claimId);
  } catch (e) {
    if (/** @type {any} */ (e)?.code === 'HOLD_NOT_ACTIVE') return /** @type {const} */ ({ confirmed: false, reason: 'SEATS_LOST' });
    throw e;
  }
  const event = newEvent(
    EVENTS.bookingConfirmed,
    { orgId: b.operatorOrgId, bookingId: String(b._id), ref: b.ref, orderId: b.orderId, tripId: b.tripId, seats: b.seats.length },
    deps,
  );
  await move(deps, b, { from: 'HELD', to: 'CONFIRMED', by: 'system:orders', set: { confirmedAt: deps.clock.now() }, events: [event] });
  return /** @type {const} */ ({ confirmed: true });
}

/** Paid after the hold ran out: the same seats held again, if still free. @param {BusEngineDeps} deps @param {OrderInfo} order @param {OrderItem} item */
async function rehold(deps, order, item) {
  const b = await loadBooking(item.bookingId);
  if (b.status === 'HELD') return { held: true, holdId: b.claimId, holdExpiresAt: null };
  if (b.status !== 'EXPIRED') return { held: false, holdId: null, holdExpiresAt: null };
  try {
    const claim = await deps.claims.hold({
      tripId: b.tripId,
      seats: b.seats.map((/** @type {any} */ s) => s.no),
      fromStopId: b.from.stopId,
      toStopId: b.to.stopId,
      ladiesOk: b.seats.filter((/** @type {any} */ s) => s.passenger.gender === 'F').map((/** @type {any} */ s) => s.no),
      by: `order:${order.id}`,
    });
    const moved = await move(deps, b, {
      from: 'EXPIRED',
      to: 'HELD',
      by: 'system:orders',
      set: { claimId: claim.id, claimIds: [...b.claimIds, claim.id] },
      note: 'paid late — seats held again',
    });
    if (!moved) await deps.claims.releaseHold(claim.id);
    return { held: moved, holdId: moved ? claim.id : null, holdExpiresAt: moved ? new Date(claim.expiresAt) : null };
  } catch (e) {
    const code = /** @type {any} */ (e)?.code;
    if (['SEAT_UNAVAILABLE', 'LADIES_SEAT', 'TRIP_DEPARTED', 'TRIP_CANCELLED', 'SALE_STOPPED'].includes(code))
      return { held: false, holdId: null, holdExpiresAt: null };
    throw e;
  }
}

/** @param {BusEngineDeps} deps @param {OrderItem} item @param {'EXPIRED' | 'FAILED'} reason */
async function release(deps, item, reason) {
  const b = await loadBooking(item.bookingId);
  if (b.claimId) await deps.claims.releaseHold(b.claimId);
  await move(deps, b, { from: reason === 'FAILED' ? ['HELD', 'EXPIRED'] : 'HELD', to: reason, by: 'system:orders' });
}

/** Cr bus company payable, GST payable, margin (the payment mode adds the debit). @param {BusEngineDeps} deps @param {OrderItem} item */
async function ledgerLines(deps, item) {
  const b = await loadBooking(item.bookingId);
  const t = b.price.totals;
  await deps.ledger.openOperatorPayable(b.operatorOrgId);
  const credits = [
    { owner: b.operatorOrgId, type: 'OPERATOR_PAYABLE', paise: t.operatorPayablePaise },
    { owner: 'platform', type: 'TAX_PAYABLE_CGST', paise: t.cgstPaise },
    { owner: 'platform', type: 'TAX_PAYABLE_SGST', paise: t.sgstPaise },
    { owner: 'platform', type: 'TAX_PAYABLE_IGST', paise: t.igstPaise },
    { owner: 'platform', type: 'REVENUE_MARGIN', paise: t.totalPaise - t.operatorPayablePaise - t.gstPaise },
  ];
  const lines = [];
  for (const c of credits) {
    if (c.paise === 0) continue;
    const accountId = await deps.ledger.accountId(c.owner, /** @type {any} */ (c.type));
    lines.push(c.paise > 0 ? { accountId, creditPaise: c.paise } : { accountId, debitPaise: -c.paise });
  }
  return lines;
}

/** A checkout that never finished: its seats given back and its booking failed. @param {BusEngineDeps} deps @param {OrderInfo} order */
async function abandon(deps, order) {
  const c = await deps.claims.activeHoldBy(`order:${order.id}`);
  if (c) await deps.claims.releaseHold(String(c._id));
  const b = await BusBookingRecord.findOne({ orderId: order.id }).setOptions(ENGINE).lean();
  if (b) await move(deps, b, { from: ['HELD', 'EXPIRED'], to: 'FAILED', by: 'system:orders', note: 'checkout not finished' });
}

/**
 * What the buyer sees — the ticket (PNR, journey, bus, seats and passengers, price with GST); admins also get the
 * breakdown, the hold and the bus company. Never the net fare or margin for buyers.
 * @param {Record<string, any>} b @param {'BUYER' | 'ADMIN'} audience
 */
export function busBookingView(b, audience) {
  const view = {
    product: 'BUS',
    bookingId: String(b._id),
    ref: b.ref,
    status: b.status,
    operatorName: b.snapshot.operatorName,
    bus: b.snapshot.bus,
    date: b.date,
    from: b.from,
    to: b.to,
    seats: b.seats,
    price: busPriceView(b.price, b.channel === 'WEBSITE' ? 'WEBSITE' : 'CLIENT'),
    confirmedAt: b.confirmedAt,
  };
  return audience === 'BUYER'
    ? view
    : { ...view, operatorOrgId: b.operatorOrgId, tripId: b.tripId, claimIds: b.claimIds, priceBreakdown: b.price };
}

/** Cancellations of bus bookings come in B7 — until then refused cleanly. */
const notYet = async () => {
  throw new ConflictError('BUS_CANCELLATION_NOT_AVAILABLE');
};

/** @param {BusEngineDeps} deps @returns {ItemHandler} */
export function createBusItemHandler(deps) {
  return {
    price: (_ctx, input) => price(deps, /** @type {BusItemInput} */ (input)),
    prepare: (_ctx, order, priced) => prepare(deps, order, priced),
    confirm: (_ctx, _order, item) => confirm(deps, item),
    rehold: (_ctx, order, item) => rehold(deps, order, item),
    release: (_ctx, _order, item, reason) => release(deps, item, reason),
    extend: async (_ctx, item) => deps.claims.extend((await loadBooking(item.bookingId)).claimId),
    ledgerLines: (_order, item) => ledgerLines(deps, item),
    abandon: (_ctx, order) => abandon(deps, order),
    view: async (item, audience) => busBookingView(await loadBooking(item.bookingId), audience),
    timeline: async (item) =>
      (await loadBooking(item.bookingId)).history.map((/** @type {any} */ h) => ({
        at: h.at,
        what: `bus booking ${item.bookingRef}: ${h.from ?? '—'} → ${h.to}`,
        by: h.by,
        note: h.note ?? null,
      })),
    cancelStart: notYet,
    cancelRooms: notYet,
    cancelLedgerLines: notYet,
    cancelDone: notYet,
  };
}
