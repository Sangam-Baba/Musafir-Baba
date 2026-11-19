// @ts-check
/** Migrations of Stage 12 (B2B dashboard). Run after 0001–0041; ids never renamed or reused. */
import { BOOKING_REQUESTS_COLLECTION } from '../modules/hotel-booking/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_12 = [
  {
    id: '0042-hbk-booking-requests',
    description:
      'Booking requests (D37): unique reference; one per price token and client; newest first per client; queue by status; relay index',
    up: async (ctx) => {
      await ctx.createCollection(BOOKING_REQUESTS_COLLECTION);
      await ctx.createIndex(BOOKING_REQUESTS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(BOOKING_REQUESTS_COLLECTION, { clientOrgId: 1, tokenHash: 1 }, { name: 'client_token_unique', unique: true });
      await ctx.createIndex(BOOKING_REQUESTS_COLLECTION, { clientOrgId: 1, createdAt: -1 }, { name: 'client_recent' });
      await ctx.createIndex(BOOKING_REQUESTS_COLLECTION, { status: 1, createdAt: 1 }, { name: 'queue' });
      await ctx.createIndex(
        BOOKING_REQUESTS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
];
