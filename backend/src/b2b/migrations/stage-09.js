// @ts-check
/** Migrations of Stage 09 (after booking, hotel operations). Run after 0001–0057; ids never renamed or reused. */
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
];
