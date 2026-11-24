// @ts-check
/**
 * What a client can subscribe to (`06-api-and-events.md` §6) and the public payload: `{ id, type, apiVersion,
 * createdAt, data }` — ids and essentials only (details are fetched through the API). Pure.
 */
export const API_VERSION = '2026-11-24';
export const WEBHOOK_EVENTS = /** @type {const} */ ([
  'booking.confirmed',
  'booking.cancelled',
  'booking.hotel_failed',
  'booking.amended',
  'payment.succeeded',
  'refund.processed',
  'wallet.low_balance',
  'quota.threshold_reached',
]);
/** @typedef {typeof WEBHOOK_EVENTS[number]} WebhookEvent */
/** @typedef {WebhookEvent} WebhookEventType */

/**
 * @param {{ id: string, type: WebhookEvent | 'webhook.test', createdAt: Date, data: Record<string, unknown> }} e
 */
export const publicPayload = (e) => ({
  id: e.id,
  type: e.type,
  apiVersion: API_VERSION,
  createdAt: e.createdAt.toISOString(),
  data: e.data,
});
