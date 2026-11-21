// @ts-check
/**
 * Stage 09 wiring for the booking summaries: an order's bookings as summary rows (order + each booking's admin view +
 * the verified payment's refunds), the order ids for a rebuild, and the event consumer that keeps rows current.
 */
import { EVENTS as HOTEL_BOOKING_EVENTS } from '../modules/hotel-booking/index.js';
import { EVENTS as ORDER_EVENTS, ORDERS, OrderRecord } from '../modules/orders/index.js';
import { IntentRecord } from '../modules/payments/index.js';
import { createBookingSummaries } from '../modules/reporting/index.js';

export const SUMMARIES_REBUILD_EVERY_MS = 24 * 60 * 60_000;

/** @param {number} total @param {number} refunded @param {boolean} paid */
const paymentState = (total, refunded, paid) => {
  if (!paid) return /** @type {const} */ ('UNPAID');
  if (refunded <= 0) return /** @type {const} */ ('PAID');
  return refunded >= total ? /** @type {const} */ ('REFUNDED') : /** @type {const} */ ('PARTLY_REFUNDED');
};

/** The order's part of a row. @param {any} o @param {number} refunded */
const orderPart = (o, refunded) => ({
  orderRef: o.ref,
  orderId: String(o._id),
  channel: o.channel,
  customerId: o.customerId ?? null,
  guestKey: o.guestKey ?? null,
  clientOrgId: o.clientOrgId ?? null,
  createdBy: o.createdBy ?? null,
  orderStatus: o.status,
  paymentState: paymentState(o.totalPaise, refunded, Boolean(o.payment?.verified)),
  refundedPaise: refunded,
  orderCreatedAt: o.createdAt,
});

/** The booking's part (from the item handler's admin view). @param {any} it @param {any} v */
const bookingPart = (it, v) => ({
  bookingRef: it.bookingRef,
  productType: it.type,
  hotelOrgId: it.hotelOrgId ?? null,
  propertyId: v.propertyId ?? null,
  propertyName: v.property?.name ?? null,
  destination: v.property?.city ?? null,
  leadGuest: v.rooms?.[0]?.leadGuest ?? null,
  checkIn: v.stay?.checkIn ?? null,
  checkOut: v.stay?.checkOut ?? null,
  bookingStatus: v.status,
  totalPaise: it.totalPaise,
});

/** @param {any} o @param {any} it @param {any} v @param {number} refunded */
const rowOf = (o, it, v, refunded) => ({ ...orderPart(o, refunded), ...bookingPart(it, v) });

/**
 * @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps
 * @param {string} orderId
 * @returns {Promise<import('../modules/reporting/summaries.service.js').SummaryRow[]>}
 */
async function rowsOf(ordersDeps, orderId) {
  const o = /^[a-f0-9]{24}$/.test(orderId)
    ? /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean())
    : null;
  if (!o) return [];
  const intent = o.payment?.verifiedIntentId
    ? /** @type {any} */ (await IntentRecord.findById(o.payment.verifiedIntentId, { refundedPaise: 1 }).lean())
    : null;
  const refunded = intent?.refundedPaise ?? 0;
  const rows = [];
  for (const it of o.items ?? [])
    rows.push(rowOf(o, it, /** @type {any} */ (await ordersDeps.handlers.get(it.type).view(it, 'ADMIN')), refunded));
  return rows;
}

/** @param {string | null} after @param {number} limit */
async function orderIds(after, limit) {
  const docs = await OrderRecord.find(after ? { _id: { $gt: after } } : {}, { _id: 1 })
    .setOptions(ORDERS)
    .sort({ _id: 1 })
    .limit(limit)
    .lean();
  return docs.map((d) => String(d._id));
}

/** @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps */
export function summariesFor(ordersDeps) {
  return createBookingSummaries({ clock: ordersDeps.clock, rowsOf: (id) => rowsOf(ordersDeps, id), orderIds });
}

/** @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps */
export function summaryJobs(ordersDeps) {
  const summaries = summariesFor(ordersDeps);
  return {
    summaries,
    consumer: {
      consumer: 'reporting-booking-summaries',
      types: [...Object.values(ORDER_EVENTS), ...Object.values(HOTEL_BOOKING_EVENTS).filter((t) => t.startsWith('hotel-booking.booking.'))],
      handler: async (/** @type {{ payload: any }} */ e) => {
        const orderId = typeof e.payload?.orderId === 'string' ? e.payload.orderId : null;
        if (orderId) await summaries.project(orderId);
      },
    },
  };
}
