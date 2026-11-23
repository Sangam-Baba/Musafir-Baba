// @ts-check
/** Stage 15 — payouts, finance and reports (new collections with allowed prefixes only). */
import { DEDUCTION_RULES_COLLECTION, PAYOUT_LINES_COLLECTION, PAYOUT_RUNS_COLLECTION } from '../modules/wallet/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_15 = [
  {
    id: '0074-wal-payout-runs',
    description: 'Payout runs (newest first; one open run checked in code), lines (per run, per hotel paid, events), deduction rules',
    up: async (ctx) => {
      await ctx.createCollection(PAYOUT_RUNS_COLLECTION);
      await ctx.createIndex(PAYOUT_RUNS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(PAYOUT_RUNS_COLLECTION, { status: 1, createdAt: -1 }, { name: 'status_recent' });
      await ctx.createCollection(PAYOUT_LINES_COLLECTION);
      await ctx.createIndex(PAYOUT_LINES_COLLECTION, { runId: 1, hotelOrgId: 1 }, { name: 'run_hotel_unique', unique: true });
      await ctx.createIndex(PAYOUT_LINES_COLLECTION, { hotelOrgId: 1, paid: 1, createdAt: -1 }, { name: 'hotel_paid' });
      await ctx.createIndex(
        PAYOUT_LINES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
      await ctx.createCollection(DEDUCTION_RULES_COLLECTION);
      await ctx.createIndex(DEDUCTION_RULES_COLLECTION, { status: 1, hotelOrgId: 1 }, { name: 'status_hotel' });
    },
  },
];
