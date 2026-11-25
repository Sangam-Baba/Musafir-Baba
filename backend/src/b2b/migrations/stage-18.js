// @ts-check
/** Stage 18 — bus service (new collections with the `bus_` prefix only, ADR-0016). */
import { LAYOUTS_COLLECTION, VEHICLES_COLLECTION } from '../modules/bus-catalog/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_18 = [
  {
    id: '0083-bus-layouts-vehicles',
    description: 'Bus layouts and buses: by operator, registration number unique, review queue',
    up: async (ctx) => {
      await ctx.createCollection(LAYOUTS_COLLECTION);
      await ctx.createIndex(LAYOUTS_COLLECTION, { operatorOrgId: 1, createdAt: 1 }, { name: 'operator' });
      await ctx.createCollection(VEHICLES_COLLECTION);
      await ctx.createIndex(
        VEHICLES_COLLECTION,
        { regNo: 1 },
        {
          name: 'reg_no_unique',
          unique: true,
          partialFilterExpression: { status: { $in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'SUSPENDED'] } },
        },
      );
      await ctx.createIndex(VEHICLES_COLLECTION, { operatorOrgId: 1, createdAt: 1 }, { name: 'operator' });
      await ctx.createIndex(VEHICLES_COLLECTION, { status: 1, updatedAt: 1 }, { name: 'review_queue' });
      await ctx.createIndex(
        VEHICLES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
];
