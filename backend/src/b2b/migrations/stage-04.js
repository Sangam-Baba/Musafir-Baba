// @ts-check
/** Migrations of Stage 04 (rooms, prices and rules per night). Run after 0001–0026; ids never renamed or reused. */
import { CANCELLATION_POLICIES_COLLECTION } from '../modules/hotel-inventory/index.js';

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
];
