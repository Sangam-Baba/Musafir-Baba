// @ts-check
/** Migrations of Stage 09 (after booking, hotel operations). Run after 0001–0057; ids never renamed or reused. */
import { AMENDMENTS_COLLECTION, CANCELLATIONS_COLLECTION, NO_SHOWS_COLLECTION } from '../modules/hotel-booking/index.js';
import { BOOKING_SUMMARIES_COLLECTION } from '../modules/reporting/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_09 = [
  {
    id: '0058-rpt-booking-summaries',
    description:
      'Booking summaries: one per booking; per order; customer / guest / client lists newest first; hotel by check-in; search on guest and references',
    up: async (ctx) => {
      await ctx.createCollection(BOOKING_SUMMARIES_COLLECTION);
      await ctx.createIndex(BOOKING_SUMMARIES_COLLECTION, { bookingRef: 1 }, { name: 'booking_unique', unique: true });
      await ctx.createIndex(BOOKING_SUMMARIES_COLLECTION, { orderId: 1 }, { name: 'order' });
      await ctx.createIndex(
        BOOKING_SUMMARIES_COLLECTION,
        { customerId: 1, orderCreatedAt: -1 },
        { name: 'customer_recent', partialFilterExpression: { customerId: { $type: 'string' } } },
      );
      await ctx.createIndex(
        BOOKING_SUMMARIES_COLLECTION,
        { guestKey: 1, orderCreatedAt: -1 },
        { name: 'guest_recent', partialFilterExpression: { guestKey: { $type: 'string' } } },
      );
      await ctx.createIndex(
        BOOKING_SUMMARIES_COLLECTION,
        { clientOrgId: 1, orderCreatedAt: -1 },
        { name: 'client_recent', partialFilterExpression: { clientOrgId: { $type: 'string' } } },
      );
      await ctx.createIndex(BOOKING_SUMMARIES_COLLECTION, { hotelOrgId: 1, checkIn: 1 }, { name: 'hotel_checkin' });
      await ctx.createIndex(
        BOOKING_SUMMARIES_COLLECTION,
        { leadGuest: 'text', bookingRef: 'text', orderRef: 'text' },
        { name: 'search_text' },
      );
    },
  },
  {
    id: '0059-hbk-cancellations',
    description: 'Cancellations: one per booking; newest first (admin monitor); per hotel',
    up: async (ctx) => {
      await ctx.createCollection(CANCELLATIONS_COLLECTION);
      await ctx.createIndex(CANCELLATIONS_COLLECTION, { bookingId: 1 }, { name: 'booking_unique', unique: true });
      await ctx.createIndex(CANCELLATIONS_COLLECTION, { requestedAt: -1 }, { name: 'recent' });
      await ctx.createIndex(CANCELLATIONS_COLLECTION, { hotelOrgId: 1, requestedAt: -1 }, { name: 'hotel_recent' });
    },
  },
  {
    id: '0060-hbk-amendments',
    description: 'Change requests: unique reference; per booking newest first; queue by status and due time; relay index',
    up: async (ctx) => {
      await ctx.createCollection(AMENDMENTS_COLLECTION);
      await ctx.createIndex(AMENDMENTS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(AMENDMENTS_COLLECTION, { bookingId: 1, createdAt: -1 }, { name: 'booking_recent' });
      await ctx.createIndex(AMENDMENTS_COLLECTION, { status: 1, firstResponseDueAt: 1 }, { name: 'queue' });
      await ctx.createIndex(
        AMENDMENTS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0061-hbk-no-shows',
    description: 'No-shows: one per booking; dispute window and settlement by status and time; per hotel; relay index',
    up: async (ctx) => {
      await ctx.createCollection(NO_SHOWS_COLLECTION);
      await ctx.createIndex(NO_SHOWS_COLLECTION, { bookingId: 1 }, { name: 'booking_unique', unique: true });
      await ctx.createIndex(NO_SHOWS_COLLECTION, { status: 1, disputeUntil: 1 }, { name: 'status_due' });
      await ctx.createIndex(NO_SHOWS_COLLECTION, { hotelOrgId: 1, markedAt: -1 }, { name: 'hotel_recent' });
      await ctx.createIndex(
        NO_SHOWS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
];
