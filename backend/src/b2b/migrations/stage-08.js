// @ts-check
/** Migrations of Stage 08 (booking engine). Run after 0001–0050; ids never renamed or reused. */
import { BOOKINGS_COLLECTION, STATUS_HISTORY_COLLECTION } from '../modules/hotel-booking/index.js';
import { ORDERS_COLLECTION } from '../modules/orders/index.js';

const relayIndex = { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } };

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_08 = [
  {
    id: '0051-ord-orders',
    description:
      'Orders: unique reference; one per idempotency key and caller; buyer / hotel lists; duplicate guard by token; open orders per IP; by payment intent; reconciler and sweeper by status time; relay index',
    up: async (ctx) => {
      await ctx.createCollection(ORDERS_COLLECTION);
      await ctx.createIndex(ORDERS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(
        ORDERS_COLLECTION,
        { 'idempotency.scope': 1, 'idempotency.key': 1 },
        { name: 'idempotency_unique', unique: true },
      );
      await ctx.createIndex(
        ORDERS_COLLECTION,
        { customerId: 1, createdAt: -1 },
        { name: 'customer_recent', partialFilterExpression: { customerId: { $type: 'string' } } },
      );
      await ctx.createIndex(
        ORDERS_COLLECTION,
        { guestKey: 1 },
        { name: 'guest', partialFilterExpression: { guestKey: { $type: 'string' } } },
      );
      await ctx.createIndex(
        ORDERS_COLLECTION,
        { clientOrgId: 1, createdAt: -1 },
        { name: 'client_recent', partialFilterExpression: { clientOrgId: { $type: 'string' } } },
      );
      await ctx.createIndex(ORDERS_COLLECTION, { hotelOrgIds: 1, createdAt: -1 }, { name: 'hotel_recent' });
      await ctx.createIndex(ORDERS_COLLECTION, { tokenHash: 1, createdAt: -1 }, { name: 'duplicate_guard' });
      await ctx.createIndex(ORDERS_COLLECTION, { ip: 1, status: 1 }, { name: 'ip_open' });
      await ctx.createIndex(
        ORDERS_COLLECTION,
        { 'payment.intentId': 1 },
        { name: 'payment_intent', partialFilterExpression: { 'payment.intentId': { $type: 'string' } } },
      );
      await ctx.createIndex(ORDERS_COLLECTION, { status: 1, statusChangedAt: 1 }, { name: 'status_time' });
      await ctx.createIndex(ORDERS_COLLECTION, { createdAt: -1 }, { name: 'recent' });
      await ctx.createIndex(ORDERS_COLLECTION, { hasPendingEvents: 1 }, relayIndex);
    },
  },
  {
    id: '0052-hbk-bookings',
    description:
      'Hotel bookings: unique reference; one per order; hotel inbox by property and status; buyer lists; reconciler by status time; relay index',
    up: async (ctx) => {
      await ctx.createCollection(BOOKINGS_COLLECTION);
      await ctx.createIndex(BOOKINGS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(BOOKINGS_COLLECTION, { orderId: 1 }, { name: 'order_unique', unique: true });
      await ctx.createIndex(BOOKINGS_COLLECTION, { hotelOrgId: 1, propertyId: 1, status: 1, createdAt: -1 }, { name: 'hotel_inbox' });
      await ctx.createIndex(
        BOOKINGS_COLLECTION,
        { customerId: 1, createdAt: -1 },
        { name: 'customer_recent', partialFilterExpression: { customerId: { $type: 'string' } } },
      );
      await ctx.createIndex(
        BOOKINGS_COLLECTION,
        { clientOrgId: 1, createdAt: -1 },
        { name: 'client_recent', partialFilterExpression: { clientOrgId: { $type: 'string' } } },
      );
      await ctx.createIndex(BOOKINGS_COLLECTION, { status: 1, statusChangedAt: 1 }, { name: 'status_time' });
      await ctx.createIndex(BOOKINGS_COLLECTION, { hasPendingEvents: 1 }, relayIndex);
    },
  },
  {
    id: '0053-hbk-status-history',
    description: 'Booking status history: per booking in time order',
    up: async (ctx) => {
      await ctx.createCollection(STATUS_HISTORY_COLLECTION);
      await ctx.createIndex(STATUS_HISTORY_COLLECTION, { hotelOrgId: 1, bookingId: 1, at: 1 }, { name: 'booking_time' });
    },
  },
];
