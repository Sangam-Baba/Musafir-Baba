// @ts-check
/**
 * The hotel item handler of the booking engine (plan Stage 08 §3.2). Orders call it through the item-handler
 * interface; it never calls orders back.
 * - `price`: the price token re-checked now (rooms + price) → the full breakdown and the copies a booking keeps;
 *   a changed price or no rooms → refused before anything is taken;
 * - `prepare`: rooms held through hotel-inventory (one hold per order, 15 min) → booking `HELD`;
 * - `confirm`: hold → booked (hotel-inventory `confirmHold`) → booking `CONFIRMED` (+ event) — or the reason it can't;
 * - `rehold`: a payment that arrived after the rooms were given back → one new hold → booking `HELD` again;
 * - `release` / `extend`, and the ledger lines a confirmed booking adds.
 * Every step is one conditional single-document update and repeat-safe; hold steps run as the system.
 */
import { createHash } from 'node:crypto';

import { systemContext } from '../../core/context.js';
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { transition } from '../../core/db/transition.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { newReference } from '../../core/ids.js';
import { nights as nightsOf } from '../hotel-inventory/index.js';
import { priceView } from '../pricing/index.js';
import { confirmationCredits, holdLinesOf } from './domain/booking.js';
import { EVENTS } from './events.js';
import { BookingRecord } from './models/booking.model.js';
import { BookingStatusRecord } from './models/status-history.model.js';

const ENGINE = systemScope('hotel-booking: booking engine', { routine: true });

/**
 * @typedef {import('../hotel-search/domain/caller.js').SearchCaller} SearchCaller
 * @typedef {import('../orders/index.js').ItemHandler} ItemHandler
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   logger: import('../../core/logger.js').Logger,
 *   holds: ReturnType<typeof import('../hotel-inventory/index.js').createHoldService>,
 *   quote: (caller: SearchCaller, token: string) => Promise<any>,
 *   facts: (propertyId: string) => Promise<Record<string, any> | null>,
 *   policyOf: (ratePlanId: string) => Promise<Record<string, any> | null>,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger>,
 * }} EngineDeps
 * @typedef {{ caller: SearchCaller, priceToken: string, rooms: { leadGuest: string, guests?: string[] }[], specialRequests?: string | null }} HotelItemInput
 */

/** @param {EngineDeps} deps @param {string} why */
const sys = (deps, why) => systemContext(`hotel-booking: ${why}`, `engine-${deps.clock.now().getTime()}`, deps.logger, deps.clock);

/** @param {string} token */
export const tokenFingerprint = (token) => createHash('sha256').update(token).digest('base64url').slice(0, 32);

/** @param {string} id */
async function loadBooking(id) {
  const b = /^[a-f0-9]{24}$/.test(id) ? await BookingRecord.findOne({ _id: id }).setOptions(ENGINE).lean() : null;
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/**
 * A status change with its history row (and event, when given).
 * @param {EngineDeps} deps
 * @param {Record<string, any>} b
 * @param {{ from: string | string[], to: string, by: string, set?: Record<string, unknown>, event?: string, note?: string }} m
 */
async function moveBooking(deps, b, m) {
  const events = m.event
    ? [
        newEvent(
          m.event,
          {
            orgId: b.hotelOrgId,
            bookingId: String(b._id),
            ref: b.ref,
            orderId: b.orderId,
            propertyId: b.propertyId,
            name: b.snapshot?.property?.name ?? null,
            checkIn: b.stay?.checkIn ?? null,
          },
          deps,
        ),
      ]
    : [];
  const moved = await transition(BookingRecord, {
    id: b._id,
    from: m.from,
    to: m.to,
    set: m.set,
    events,
    clock: deps.clock,
    options: ENGINE,
  });
  if (moved)
    await BookingStatusRecord.create({
      bookingId: String(b._id),
      hotelOrgId: b.hotelOrgId,
      from: b.status,
      to: m.to,
      at: deps.clock.now(),
      by: m.by,
      note: m.note ?? null,
    });
  return moved;
}

/** @param {EngineDeps} deps @param {HotelItemInput} input */
async function price(deps, input) {
  const q = await deps.quote(input.caller, input.priceToken);
  if (q.status === 'SOLD_OUT') throw new ConflictError('SOLD_OUT');
  if (q.status === 'PRICE_CHANGED')
    throw new ConflictError('PRICE_CHANGED', { quotedTotalPaise: q.quotedTotalPaise, price: q.price, priceToken: q.priceToken });
  if (input.rooms.length !== q.stay.occupancies.length)
    throw new DomainError('ROOMS_DONT_MATCH_STAY', { rooms: q.stay.occupancies.length });
  const [facts, policy] = await Promise.all([deps.facts(q.stay.propertyId), deps.policyOf(q.stay.ratePlanId)]);
  if (!facts || !policy) throw new ConflictError('SOLD_OUT');
  return {
    totalPaise: q.breakdown.totals.totalPaise,
    gstPaise: q.breakdown.totals.gstPaise,
    hotelOrgId: facts.hotelOrgId,
    tokenHash: tokenFingerprint(input.priceToken),
    data: { stay: q.stay, breakdown: q.breakdown, facts, policy, roomTypeName: q.roomTypeName, input },
  };
}

/**
 * @param {EngineDeps} deps
 * @param {import('../orders/index.js').OrderInfo} order
 * @param {Awaited<ReturnType<typeof price>>} priced
 */
async function prepare(deps, order, priced) {
  const { stay, breakdown, facts, policy, roomTypeName, input } = priced.data;
  const nights = nightsOf(stay.checkIn, stay.checkOut);
  const hold = await deps.holds.holdRooms(sys(deps, 'hold rooms'), {
    orderId: order.id,
    hotelOrgId: facts.hotelOrgId,
    propertyId: stay.propertyId,
    lines: holdLinesOf(stay, nights),
  });
  const b = await BookingRecord.findOneAndUpdate(
    { orderId: order.id },
    {
      $setOnInsert: {
        ref: newReference('MBH'),
        orderId: order.id,
        orderRef: order.ref,
        channel: order.channel,
        hotelOrgId: facts.hotelOrgId,
        propertyId: stay.propertyId,
        clientOrgId: order.buyer.clientOrgId,
        customerId: order.buyer.customerId,
        guestKey: order.buyer.guestKey,
        holdId: hold.id,
        holdIds: [hold.id],
        stay: { ...stay, nights },
        rooms: input.rooms.map((r) => ({ leadGuest: r.leadGuest.trim(), guests: (r.guests ?? []).map((g) => g.trim()) })),
        contact: order.contact,
        specialRequests: input.specialRequests?.trim() || null,
        snapshot: { property: facts, roomTypeName, ratePlanName: policy.ratePlanName, mealPlanKey: policy.mealPlanKey, policy },
        price: breakdown,
        totalPaise: breakdown.totals.totalPaise,
        gstPaise: breakdown.totals.gstPaise,
        status: 'HELD',
        statusChangedAt: deps.clock.now(),
      },
    },
    { upsert: true, new: true },
  )
    .setOptions(ENGINE)
    .lean();
  const booking = /** @type {Record<string, any>} */ (b);
  return {
    item: {
      type: 'HOTEL',
      bookingId: String(booking._id),
      bookingRef: booking.ref,
      hotelOrgId: booking.hotelOrgId,
      holdId: hold.id,
      totalPaise: booking.totalPaise,
      gstPaise: booking.gstPaise,
    },
    holdExpiresAt: new Date(hold.expiresAt),
  };
}

/** @param {EngineDeps} deps @param {import('../orders/index.js').OrderItem} item */
async function confirm(deps, item) {
  const b = await loadBooking(item.bookingId);
  if (b.status === 'CONFIRMED') return /** @type {const} */ ({ confirmed: true });
  if (b.status !== 'HELD' || !b.holdId) return { confirmed: /** @type {const} */ (false), reason: `BOOKING_${b.status}` };
  try {
    await deps.holds.confirmHold(sys(deps, 'confirm rooms'), { holdId: b.holdId, bookingId: String(b._id) });
  } catch (e) {
    const code = /** @type {any} */ (e)?.code;
    if (code !== 'NIGHT_LOST' && code !== 'HOLD_NOT_ACTIVE') throw e;
    // the hold is gone (expired and given back, or a night lost): the booking waits as EXPIRED — `rehold` may try again
    await moveBooking(deps, b, { from: 'HELD', to: 'EXPIRED', by: 'system:orders', note: `hold gone (${code})` });
    return { confirmed: /** @type {const} */ (false), reason: code };
  }
  await moveBooking(deps, b, {
    from: 'HELD',
    to: 'CONFIRMED',
    by: 'system:orders',
    set: { confirmedAt: deps.clock.now() },
    event: EVENTS.bookingConfirmed,
  });
  return /** @type {const} */ ({ confirmed: true });
}

/** @param {EngineDeps} deps @param {import('../orders/index.js').OrderInfo} order @param {import('../orders/index.js').OrderItem} item */
async function rehold(deps, order, item) {
  const b = await loadBooking(item.bookingId);
  if (b.status === 'HELD') return { held: true, holdId: b.holdId, holdExpiresAt: null };
  if (b.status !== 'EXPIRED') return { held: false, holdId: null, holdExpiresAt: null };
  try {
    const hold = await deps.holds.holdRooms(sys(deps, 'hold rooms again (paid late)'), {
      orderId: `${order.id}:${b.holdIds.length}`,
      hotelOrgId: b.hotelOrgId,
      propertyId: b.propertyId,
      lines: holdLinesOf(b.stay, b.stay.nights),
    });
    const moved = await moveBooking(deps, b, {
      from: 'EXPIRED',
      to: 'HELD',
      by: 'system:orders',
      set: { holdId: hold.id, holdIds: [...b.holdIds, hold.id] },
      note: 'paid late — rooms held again',
    });
    if (!moved) {
      // another worker held them at the same moment (same hold key → same hold): keep it if the booking uses it
      const now = await loadBooking(item.bookingId);
      if (now.status === 'HELD' && now.holdId === hold.id) return { held: true, holdId: hold.id, holdExpiresAt: new Date(hold.expiresAt) };
      await deps.holds.releaseHold(sys(deps, 'give back a second hold'), hold.id);
    }
    return { held: moved, holdId: moved ? hold.id : null, holdExpiresAt: moved ? new Date(hold.expiresAt) : null };
  } catch (e) {
    if (/** @type {any} */ (e)?.code === 'SOLD_OUT') return { held: false, holdId: null, holdExpiresAt: null };
    throw e;
  }
}

/** @param {EngineDeps} deps @param {import('../orders/index.js').OrderItem} item @param {'EXPIRED' | 'FAILED'} reason */
async function release(deps, item, reason) {
  const b = await loadBooking(item.bookingId);
  if (b.holdId)
    await deps.holds.releaseHold(sys(deps, 'give rooms back'), b.holdId).catch((e) => {
      if (/** @type {any} */ (e)?.code !== 'HOLD_NOT_FOUND') throw e;
    });
  await moveBooking(deps, b, { from: reason === 'FAILED' ? ['HELD', 'EXPIRED'] : 'HELD', to: reason, by: 'system:orders' });
}

/** @param {EngineDeps} deps @param {import('../orders/index.js').OrderItem} item */
async function ledgerLines(deps, item) {
  const b = await loadBooking(item.bookingId);
  await deps.ledger.openHotelPayable(b.hotelOrgId);
  const lines = [];
  for (const l of confirmationCredits(b.price.totals)) {
    const accountId = await deps.ledger.accountId(l.type === 'PAYABLE' ? b.hotelOrgId : 'platform', l.type);
    lines.push({ accountId, ...(l.debitPaise ? { debitPaise: l.debitPaise } : { creditPaise: l.creditPaise }) });
  }
  return lines;
}

/**
 * A checkout that never finished: its rooms given back (by order id) and its booking, if any, failed.
 * @param {EngineDeps} deps
 * @param {import('../orders/index.js').OrderInfo} order
 */
async function abandon(deps, order) {
  const ctx = sys(deps, 'give back an unfinished checkout');
  const h = await deps.holds.holdOfOrder(ctx, order.id);
  if (h) await deps.holds.releaseHold(ctx, h.id);
  const b = await BookingRecord.findOne({ orderId: order.id }).setOptions(ENGINE).lean();
  if (b) await moveBooking(deps, b, { from: ['HELD', 'EXPIRED'], to: 'FAILED', by: 'system:orders', note: 'checkout not finished' });
}

/**
 * What the buyer sees (their price view: total and GST — never the hotel rate or margin); admins get everything.
 * @param {Record<string, any>} b
 * @param {'BUYER' | 'ADMIN'} audience
 */
export function bookingView(b, audience) {
  const p = b.snapshot.property;
  const view = {
    bookingId: String(b._id),
    ref: b.ref,
    status: b.status,
    property: {
      ref: p.publicRef,
      name: p.name,
      address: p.address,
      city: p.cityName,
      area: p.areaName,
      checkInTime: p.checkInTime,
      checkOutTime: p.checkOutTime,
    },
    roomTypeName: b.snapshot.roomTypeName,
    ratePlanName: b.snapshot.ratePlanName,
    mealPlanKey: b.snapshot.mealPlanKey,
    cancellation: { summary: b.snapshot.policy.summary, nonRefundable: b.snapshot.policy.nonRefundable },
    stay: { checkIn: b.stay.checkIn, checkOut: b.stay.checkOut, nights: b.stay.nights.length, occupancies: b.stay.occupancies },
    rooms: b.rooms,
    specialRequests: b.specialRequests,
    price: priceView(b.price, b.channel === 'WEBSITE' ? 'WEBSITE' : 'CLIENT'),
    confirmedAt: b.confirmedAt,
  };
  if (audience === 'BUYER') return view;
  return {
    ...view,
    hotelOrgId: b.hotelOrgId,
    propertyId: b.propertyId,
    holdIds: b.holdIds,
    priceBreakdown: b.price,
    acknowledgedAt: b.acknowledgedAt,
    failure: b.failure,
  };
}

/** @param {EngineDeps} deps @returns {ItemHandler} */
export function createHotelItemHandler(deps) {
  return {
    price: (_ctx, input) => price(deps, /** @type {HotelItemInput} */ (input)),
    prepare: (_ctx, order, priced) => prepare(deps, order, /** @type {any} */ (priced)),
    confirm: (_ctx, _order, item) => confirm(deps, item),
    rehold: (_ctx, order, item) => rehold(deps, order, item),
    release: (_ctx, _order, item, reason) => release(deps, item, reason),
    extend: async (_ctx, item) => {
      const b = await loadBooking(item.bookingId);
      return new Date((await deps.holds.extendHold(sys(deps, 'extend the hold'), b.holdId)).expiresAt);
    },
    ledgerLines: (_order, item) => ledgerLines(deps, item),
    abandon: (_ctx, order) => abandon(deps, order),
    view: async (item, audience) => bookingView(await loadBooking(item.bookingId), audience),
  };
}
