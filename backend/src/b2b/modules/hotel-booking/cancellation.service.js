// @ts-check
/**
 * Cancellation terms of a booking for its buyer (plan Stage 09 §3.3–3.4): the deadlines from the policy copy kept at
 * booking time — as moments, and in hotel time — what cancelling now would cost, and whether it can still be cancelled
 * online (confirmed, before the check-in day in hotel time). The quote and the cancel itself build on this (S09-T04/T05).
 */
import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';

import { todayIn } from '../../core/dates.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { bookingView } from './booking.service.js';
import { cancellationCharge, checkInAt, deadlines, nightAmounts } from './domain/cancellation-charge.js';
import { BookingRecord } from './models/booking.model.js';

const READ = systemScope('hotel-booking: cancellation terms', { routine: true });
export const BUFFER_HOURS = 0; // D5 (owner, for now): our deadline = the hotel's
export const QUOTE_MINUTES = 5;

/** @param {Date} d @param {string} timeZone */
const hotelTime = (d, timeZone) =>
  d.toLocaleString('en-IN', { timeZone, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** @param {string} ref */
export async function bookingByRef(ref) {
  const canonical = parseReference(ref);
  const b = canonical?.startsWith('MBH-') ? await BookingRecord.findOne({ ref: canonical }).setOptions(READ).lean() : null;
  if (!b) throw new NotFoundError('BOOKING_NOT_FOUND');
  return /** @type {Record<string, any>} */ (b);
}

/**
 * @param {Record<string, any>} b the booking
 * @param {Date} now
 */
export function termsOf(b, now) {
  const p = b.snapshot.property;
  const tz = p.timeZone ?? 'Asia/Kolkata';
  const checkIn = checkInAt(b.stay, p);
  const d = deadlines(b.snapshot.policy, checkIn, BUFFER_HOURS);
  const paid = b.totalPaise;
  const nowCharge = cancellationCharge({
    policy: b.snapshot.policy,
    checkIn,
    now,
    bufferHours: BUFFER_HOURS,
    paidPaise: paid,
    nights: nightAmounts(b.price),
  });
  const beforeCheckInDay = todayIn({ now: () => now }, tz) < b.stay.checkIn;
  return {
    timeZone: tz,
    checkInAt: checkIn.toISOString(),
    checkInHotelTime: hotelTime(checkIn, tz),
    nonRefundable: d.nonRefundable,
    freeUntil: d.freeUntil ? { at: d.freeUntil.toISOString(), hotelTime: hotelTime(d.freeUntil, tz) } : null,
    steps: d.steps.map((s) => ({ from: s.from ? { at: s.from.toISOString(), hotelTime: hotelTime(s.from, tz) } : null, text: s.text })),
    summary: b.snapshot.policy.summary,
    ifCancelledNow: { chargePaise: nowCharge.chargePaise, refundPaise: nowCharge.refundPaise },
    canCancelOnline: b.status === 'CONFIRMED' && beforeCheckInDay,
  };
}

/** @param {string} secret */
const quoteKey = (secret) => Buffer.from(hkdfSync('sha256', secret, 'musafirbaba-b2b', 'cancellation-quote', 32));

/**
 * A signed cancellation quote (valid 5 minutes): the booking, the charge and refund as shown, and the booking's
 * status time — so a quote can't be reused after the booking changed or edited in the browser.
 * @param {Record<string, any>} b
 * @param {{ now: Date, secret: string }} a
 */
export function signQuote(b, a) {
  const t = termsOf(b, a.now);
  if (b.status !== 'CONFIRMED') throw new ConflictError('BOOKING_NOT_CANCELLABLE', { bookingStatus: b.status });
  if (!t.canCancelOnline) throw new DomainError('CANCEL_ONLINE_CLOSED');
  const payload = {
    v: 1,
    bookingId: String(b._id),
    chargePaise: t.ifCancelledNow.chargePaise,
    refundPaise: t.ifCancelledNow.refundPaise,
    since: new Date(b.statusChangedAt).getTime(),
    exp: a.now.getTime() + QUOTE_MINUTES * 60_000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', quoteKey(a.secret)).update(body).digest('base64url');
  return {
    quoteToken: `${body}.${mac}`,
    chargePaise: payload.chargePaise,
    refundPaise: payload.refundPaise,
    expiresAt: new Date(payload.exp),
    nonRefundable: t.nonRefundable,
    paidPaise: b.totalPaise,
  };
}

/**
 * The quote, checked: our signature, this booking, not expired, the booking unchanged since. Throws otherwise.
 * @param {string} token
 * @param {Record<string, any>} b
 * @param {{ now: Date, secret: string }} a
 * @returns {{ chargePaise: number, refundPaise: number }}
 */
export function readQuote(token, b, a) {
  const [body, mac] = typeof token === 'string' && token.length < 2000 ? token.split('.') : [];
  const good = body && mac ? createHmac('sha256', quoteKey(a.secret)).update(body).digest('base64url') : '';
  if (!body || !mac || good.length !== mac.length || !timingSafeEqual(Buffer.from(good), Buffer.from(mac)))
    throw new DomainError('QUOTE_INVALID');
  const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (p.bookingId !== String(b._id)) throw new DomainError('QUOTE_INVALID');
  if (a.now.getTime() > p.exp) throw new DomainError('QUOTE_EXPIRED');
  if (p.since !== new Date(b.statusChangedAt).getTime()) throw new ConflictError('BOOKING_CHANGED');
  if (p.chargePaise + p.refundPaise !== b.totalPaise) throw new DomainError('QUOTE_INVALID');
  return { chargePaise: p.chargePaise, refundPaise: p.refundPaise };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createCustomerBookings(deps) {
  return {
    /** The booking (buyer view) and its terms — the caller checks the buyer owns the order first. @param {string} ref */
    async detail(ref) {
      const b = await bookingByRef(ref);
      return { orderId: b.orderId, orderRef: b.orderRef, booking: bookingView(b, 'BUYER'), terms: termsOf(b, deps.clock.now()) };
    },
    bookingByRef,
    /** @param {string} ref @param {string} secret */
    quote: async (ref, secret) => signQuote(await bookingByRef(ref), { now: deps.clock.now(), secret }),
  };
}
