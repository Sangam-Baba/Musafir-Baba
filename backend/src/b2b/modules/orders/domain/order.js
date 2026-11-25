// @ts-check
/**
 * Orders — pure rules (plan Stage 08 §3.1, `04-…` §7.3, `05-…` §6).
 * One order = what the buyer pays for at once; its items (hotel bookings now) are handled by item handlers, its
 * payment by a payment-mode strategy (PayU now; wallet / credit plug in at Stage 12).
 *
 *   HOLDING ─► AWAITING_PAYMENT ─► CONFIRMING ─► CONFIRMED ─► CANCELLED | COMPLETED
 *      │            │  ▲   └─► PAYMENT_PENDING ─┘ (PayU pending; the poller resolves)
 *      └► FAILED    │  └─ a failed attempt (rooms still held → pay again)
 *                   ├─► EXPIRED (window over, nothing paid) ─► CONFIRMING (paid late, rooms held again)
 *                   └─► FAILED (paid but the rooms are lost → refunded)
 *
 * HOLDING and CONFIRMING are short middle steps the reconciler finishes (back for HOLDING, forward for CONFIRMING).
 * A gateway order is never CONFIRMED without a payment PayU verified.
 */
import { DomainError } from '../../../core/errors.js';

export const ORDER_STATUSES = /** @type {const} */ ([
  'HOLDING',
  'AWAITING_PAYMENT',
  'PAYMENT_PENDING',
  'CONFIRMING',
  'CONFIRMED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
]);
/** @typedef {typeof ORDER_STATUSES[number]} OrderStatus */

/** @type {Readonly<Record<OrderStatus, readonly OrderStatus[]>>} */
export const ORDER_TRANSITIONS = Object.freeze({
  HOLDING: ['AWAITING_PAYMENT', 'FAILED'],
  AWAITING_PAYMENT: ['PAYMENT_PENDING', 'CONFIRMING', 'EXPIRED', 'FAILED'],
  PAYMENT_PENDING: ['AWAITING_PAYMENT', 'CONFIRMING', 'EXPIRED', 'FAILED'],
  CONFIRMING: ['CONFIRMED', 'FAILED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  EXPIRED: ['CONFIRMING', 'FAILED'], // only a payment that arrives late
  FAILED: [],
  CANCELLED: [],
  COMPLETED: [],
});

/** Still waiting for the buyer (counts against the open-orders limit; the sweeper watches these). */
export const OPEN_ORDER_STATUSES = /** @type {const} */ (['HOLDING', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'CONFIRMING']);

export const ORDER_CHANNELS = /** @type {const} */ (['WEBSITE', 'B2B_PORTAL', 'B2B_API', 'ADMIN']);
export const PAYMENT_MODES = /** @type {const} */ (['GATEWAY', 'WALLET', 'CREDIT']);
export const ITEM_TYPES = /** @type {const} */ (['HOTEL', 'BUS']); // BUS: Stage 18 B6 (bus-booking handler, ADR-0016)

/** Timers (`05-…` §6). */
export const PAYMENT_WINDOW_MAX_MINUTES = 12;
export const PAYMENT_WINDOW_MARGIN_MINUTES = 2;
export const MIN_HOLD_LEFT_TO_PAY_MINUTES = 5;
export const DUPLICATE_WINDOW_MINUTES = 2;

/**
 * Safety limits (plan Stage 08 §3.7; owner defaults, 19 Nov 2026 — changeable): open orders at once per buyer and per
 * IP, the largest order taken online (bigger ones: "call us"), and when many orders from one IP raise an alert.
 */
export const ORDER_LIMITS = Object.freeze({
  openPerBuyer: 3,
  openPerIp: 5,
  maxOrderPaise: 50_000_000, // ₹5,00,000
  alertPerIpPerHour: 10,
});

/**
 * B2B clients (plan Stage 12 §3.13; owner defaults): up to 20 orders waiting at once per company (an office shares one
 * IP, so the IP limit matches), the same largest online order; bigger ones are booked offline by MusafirBaba.
 */
export const CLIENT_ORDER_LIMITS = Object.freeze({
  openPerBuyer: 20,
  openPerIp: 20,
  maxOrderPaise: 50_000_000,
  alertPerIpPerHour: 60,
});

/** @param {OrderStatus} from @param {OrderStatus} to */
export function assertOrderTransition(from, to) {
  if (!ORDER_TRANSITIONS[from]?.includes(to)) throw new DomainError('ORDER_STATUS', { from, to });
}

/**
 * When a PayU checkout may start, and how long its window is.
 * - < 5 min of hold left and not yet extended → extend first;
 * - ≥ 5 min left → window = min(12 min, hold end − 2 min), so the payment always ends before the hold;
 * - otherwise → too late to pay (the buyer starts again).
 * @param {{ holdExpiresAt: Date, extendedOnce: boolean, now: Date }} a
 * @returns {{ action: 'EXTEND' } | { action: 'PAY', windowMinutes: number, windowEndsAt: Date } | { action: 'TOO_LATE' }}
 */
export function paymentPlan(a) {
  const leftMs = a.holdExpiresAt.getTime() - a.now.getTime();
  if (leftMs < MIN_HOLD_LEFT_TO_PAY_MINUTES * 60_000) return a.extendedOnce ? { action: 'TOO_LATE' } : { action: 'EXTEND' };
  const windowMs = Math.min(PAYMENT_WINDOW_MAX_MINUTES * 60_000, leftMs - PAYMENT_WINDOW_MARGIN_MINUTES * 60_000);
  return { action: 'PAY', windowMinutes: windowMs / 60_000, windowEndsAt: new Date(a.now.getTime() + windowMs) };
}

const NAME = /^[\p{L}][\p{L} .'-]{0,59}$/u;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
const PHONE = /^\+?[0-9]{10,14}$/;

/**
 * Buyer input checks (plan §3.3, §7): lead guest names (letters, spaces, `.'-`), contact, special requests.
 * Returns the problems (empty = fine).
 * @param {{ contact: { name: string, email: string, phone: string }, rooms?: { leadGuest: string, guests?: string[] }[], specialRequests?: string | null }} a
 */
export function checkBuyerInput(a) {
  /** @type {{ field: string, code: string }[]} */
  const problems = [];
  if (!NAME.test(a.contact.name.trim())) problems.push({ field: 'contact.name', code: 'NAME_INVALID' });
  if (!EMAIL.test(a.contact.email.trim())) problems.push({ field: 'contact.email', code: 'EMAIL_INVALID' });
  if (!PHONE.test(a.contact.phone.replace(/[\s-]/g, ''))) problems.push({ field: 'contact.phone', code: 'PHONE_INVALID' });
  (a.rooms ?? []).forEach((r, i) => {
    // hotels only — a bus item checks its passengers in its own handler
    if (!NAME.test(r.leadGuest.trim())) problems.push({ field: `rooms.${i}.leadGuest`, code: 'NAME_INVALID' });
    (r.guests ?? []).forEach((g, j) => {
      if (!NAME.test(g.trim())) problems.push({ field: `rooms.${i}.guests.${j}`, code: 'NAME_INVALID' });
    });
  });
  if ((a.specialRequests ?? '').length > 500) problems.push({ field: 'specialRequests', code: 'TOO_LONG' });
  return problems;
}
