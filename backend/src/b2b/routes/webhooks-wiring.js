// @ts-check
/**
 * Stage 14 webhook wiring: internal events → the published client events (`06-api-and-events.md` §6) for the B2B
 * client company the event belongs to (found through the order) → deliveries; the sender runs every 15 seconds.
 * Nothing is registered unless `B2B_API_ENABLED=true` — then no event is queued and nothing is ever sent.
 */
import { BookingRecord, EVENTS as BOOKING } from '../modules/hotel-booking/index.js';
import { ORDERS, OrderRecord, EVENTS as ORDER } from '../modules/orders/index.js';
import { EVENTS as PAYMENT } from '../modules/payments/index.js';
import { EVENTS as SUBSCRIPTION } from '../modules/subscriptions/index.js';
import { EVENTS as WALLET } from '../modules/wallet/index.js';
import { createDeliveries } from '../modules/webhooks/index.js';
import { apiEnabled } from './api-keys-wiring.js';

export const WEBHOOK_SEND_EVERY_MS = 15_000;
const SCOPE = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'webhooks: whose event' };
const ORG_ID = /^[a-f0-9]{24}$/;

/** @param {unknown} id */
async function orderOf(id) {
  if (typeof id !== 'string' || !ORG_ID.test(id)) return null;
  return /** @type {Record<string, any> | null} */ (
    await OrderRecord.findOne({ _id: id }, { ref: 1, clientOrgId: 1, items: 1, channel: 1 }).setOptions(ORDERS).lean()
  );
}
/** A booking's order (events about one booking may only carry the booking id). @param {Record<string, any>} p */
async function orderOfBooking(p) {
  if (p.orderId) return orderOf(String(p.orderId));
  const b =
    typeof p.bookingId === 'string' && ORG_ID.test(p.bookingId)
      ? await BookingRecord.findOne({ _id: p.bookingId }, { orderId: 1 }).setOptions(SCOPE).lean()
      : null;
  return b ? orderOf(String(/** @type {any} */ (b).orderId)) : null;
}

/** @typedef {{ orgId: string, type: import('../modules/webhooks/index.js').WebhookEventType, data: Record<string, unknown> } | null} Mapped */

/** @param {Record<string, any> | null} o @param {any} type @param {Record<string, unknown>} data @returns {Mapped} */
const forOrder = (o, type, data) => (o?.clientOrgId ? { orgId: String(o.clientOrgId), type, data: { orderRef: o.ref, ...data } } : null);
/** An event that already names the client company. @param {any} type @param {(p: Record<string, any>) => Record<string, unknown>} data */
const forOrg = (type, data) => async (/** @type {Record<string, any>} */ p) =>
  ORG_ID.test(String(p.orgId)) ? { orgId: String(p.orgId), type, data: data(p) } : null;

/** @type {Record<string, (p: Record<string, any>) => Promise<Mapped>>} */
const MAPPERS = {
  [ORDER.orderConfirmed]: async (p) => {
    const o = await orderOf(p.orderId);
    return forOrder(o, 'booking.confirmed', {
      bookingRefs: (o?.items ?? []).map((/** @type {any} */ it) => it.bookingRef),
      status: 'CONFIRMED',
    });
  },
  [BOOKING.bookingCancelled]: async (p) =>
    forOrder(await orderOfBooking(p), 'booking.cancelled', { bookingRef: p.ref ?? null, status: 'CANCELLED' }),
  [BOOKING.hotelFailed]: async (p) =>
    forOrder(await orderOfBooking(p), 'booking.hotel_failed', { bookingRef: p.ref ?? p.bookingRef ?? null }),
  [BOOKING.amendmentClosed]: async (p) =>
    forOrder(await orderOfBooking(p), 'booking.amended', { bookingRef: p.bookingRef ?? null, change: p.type ?? null }),
  [PAYMENT.intentSucceeded]: forOrg('payment.succeeded', (p) => ({ txnId: p.txnId, purpose: p.purpose, amountPaise: p.amountPaise })),
  [PAYMENT.refundSucceeded]: forOrg('refund.processed', (p) => ({ refundId: p.refundId, txnId: p.txnId, amountPaise: p.amountPaise })),
  [WALLET.lowBalance]: forOrg('wallet.low_balance', (p) => ({ thresholdPaise: p.amountPaise })),
  [SUBSCRIPTION.quotaReached]: forOrg('quota.threshold_reached', (p) => ({ percent: p.percent, used: p.used, limit: p.limit })),
};

/**
 * The public event for an internal one, or null (not a client's, or nothing to tell).
 * @param {{ type: string, payload: Record<string, any> }} e @returns {Promise<Mapped>}
 */
export const toPublicEvent = async (e) => (MAPPERS[e.type] ? (MAPPERS[e.type]?.(e.payload ?? {}) ?? null) : null);

export const WEBHOOK_SOURCE_EVENTS = Object.keys(MAPPERS);

/** @param {import('../core/clock.js').Clock} clock @param {NodeJS.ProcessEnv} env */
export const deliveriesFor = (clock, env) => createDeliveries({ clock, sealKey: env.B2B_AUTH_SECRET ?? '' });

/**
 * Background parts (consumer + sender schedule) — none while the API is switched off.
 * @param {import('../core/clock.js').Clock} clock @param {NodeJS.ProcessEnv} env
 */
export function webhookParts(clock, env) {
  if (!apiEnabled(env)) return { consumers: [], schedules: [] };
  const deliveries = deliveriesFor(clock, env);
  return {
    consumers: [
      {
        consumer: 'webhooks-public-events',
        types: WEBHOOK_SOURCE_EVENTS,
        handler: async (/** @type {any} */ event) => {
          const m = await toPublicEvent(event);
          if (m)
            await deliveries.enqueue(m.orgId, {
              eventId: `evt_${event.eventId}`,
              type: m.type,
              createdAt: new Date(event.occurredAt),
              data: m.data,
            });
        },
      },
    ],
    schedules: [{ name: 'webhooks-send', everyMs: WEBHOOK_SEND_EVERY_MS, run: () => deliveries.sendDue() }],
  };
}
