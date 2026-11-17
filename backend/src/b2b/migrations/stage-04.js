// @ts-check
/** Migrations of Stage 04 (rooms, prices and rules per night). Run after 0001–0026; ids never renamed or reused. */
import { CANCELLATION_POLICIES_COLLECTION, RATE_PLANS_COLLECTION } from '../modules/hotel-inventory/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_04 = [
  {
    id: '0027-inv-cancellation-policies',
    description: 'Cancellation policies: by property; a name only once per property (active ones)',
    up: async (ctx) => {
      await ctx.createCollection(CANCELLATION_POLICIES_COLLECTION);
      await ctx.createIndex(CANCELLATION_POLICIES_COLLECTION, { hotelOrgId: 1, propertyId: 1, status: 1 }, { name: 'property' });
      await ctx.createIndex(
        CANCELLATION_POLICIES_COLLECTION,
        { propertyId: 1, nameKey: 1 },
        { name: 'property_name_unique', unique: true, partialFilterExpression: { status: 'ACTIVE' } },
      );
    },
  },
  {
    id: '0028-inv-rate-plans',
    description:
      'Rate plans: by property in display order; a name only once per property (archived plans give theirs up); plans following a plan; plans using a policy',
    up: async (ctx) => {
      await ctx.createCollection(RATE_PLANS_COLLECTION);
      await ctx.createIndex(RATE_PLANS_COLLECTION, { hotelOrgId: 1, propertyId: 1, status: 1, order: 1 }, { name: 'property' });
      await ctx.createIndex(
        RATE_PLANS_COLLECTION,
        { propertyId: 1, nameKey: 1 },
        { name: 'property_name_unique', unique: true }, // archiving frees the name (its key gets the plan id appended)
      );
      await ctx.createIndex(
        RATE_PLANS_COLLECTION,
        { 'derived.parentRatePlanId': 1 },
        { name: 'parent', partialFilterExpression: { 'derived.parentRatePlanId': { $exists: true } } },
      );
      await ctx.createIndex(RATE_PLANS_COLLECTION, { cancellationPolicyId: 1, status: 1 }, { name: 'policy' });
    },
  },
];
