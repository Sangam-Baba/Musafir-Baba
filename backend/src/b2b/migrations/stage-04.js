// @ts-check
/** Migrations of Stage 04 (rooms, prices and rules per night). Run after 0001–0026; ids never renamed or reused. */
import {
  CANCELLATION_POLICIES_COLLECTION,
  CHANGE_LOG_COLLECTION,
  INVENTORY_DAY_VALIDATOR,
  INVENTORY_DAYS_COLLECTION,
  RATE_DAYS_COLLECTION,
  RATE_PLANS_COLLECTION,
} from '../modules/hotel-inventory/index.js';

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
  {
    id: '0029-inv-inventory-days',
    description:
      'Nights per room type: the database rule (booked + held never above total, no negatives, counts match their owners); one night per room type and date; by property and date; holds by expiry',
    up: async (ctx) => {
      await ctx.createCollection(INVENTORY_DAYS_COLLECTION, { validator: INVENTORY_DAY_VALIDATOR });
      await ctx.createIndex(INVENTORY_DAYS_COLLECTION, { roomTypeId: 1, date: 1 }, { name: 'room_type_date_unique', unique: true });
      await ctx.createIndex(INVENTORY_DAYS_COLLECTION, { hotelOrgId: 1, propertyId: 1, date: 1 }, { name: 'property_date' });
      await ctx.createIndex(INVENTORY_DAYS_COLLECTION, { propertyId: 1, date: 1 }, { name: 'availability' });
      await ctx.createIndex(
        INVENTORY_DAYS_COLLECTION,
        { 'holds.expiresAt': 1 },
        { name: 'hold_expiry', partialFilterExpression: { 'holds.0': { $exists: true } } },
      );
    },
  },
  {
    id: '0030-inv-rate-days',
    description: 'Prices and rules per rate plan, room type and night: one per plan, room type and date; by property and date',
    up: async (ctx) => {
      await ctx.createCollection(RATE_DAYS_COLLECTION);
      await ctx.createIndex(
        RATE_DAYS_COLLECTION,
        { ratePlanId: 1, roomTypeId: 1, date: 1 },
        { name: 'plan_room_date_unique', unique: true },
      );
      await ctx.createIndex(RATE_DAYS_COLLECTION, { hotelOrgId: 1, propertyId: 1, date: 1 }, { name: 'property_date' });
    },
  },
  {
    id: '0031-inv-change-log',
    description: 'Calendar change log: one entry per request id and property; newest first per property; by month (archiving)',
    up: async (ctx) => {
      await ctx.createCollection(CHANGE_LOG_COLLECTION);
      await ctx.createIndex(CHANGE_LOG_COLLECTION, { propertyId: 1, requestId: 1 }, { name: 'property_request_unique', unique: true });
      await ctx.createIndex(CHANGE_LOG_COLLECTION, { hotelOrgId: 1, propertyId: 1, createdAt: -1 }, { name: 'property_recent' });
      await ctx.createIndex(CHANGE_LOG_COLLECTION, { month: 1 }, { name: 'month' });
    },
  },
];
