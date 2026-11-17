// @ts-check
/**
 * `inv_rate_plans`: what a property sells (plan Stage 04 §3.1) — room types, meal plan, cancellation policy,
 * pricing model, booking window; a derived plan follows another plan's prices (+ amount or %). Owned by the
 * hotel org, read through the property. Archived, never deleted (bookings refer to them).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { ADJUST_TYPES, PRICING_MODELS, RATE_PLAN_STATUSES } from '../domain/rate-plan.js';

export const RATE_PLANS_COLLECTION = 'inv_rate_plans';

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    nameKey: { type: String, required: true },
    roomTypeIds: { type: [String], required: true },
    mealPlanKey: { type: String, required: true },
    cancellationPolicyId: { type: String, required: true },
    pricingModel: { type: String, enum: PRICING_MODELS, required: true },
    minAdvanceDays: { type: Number, required: true, min: 0, max: 730 },
    maxAdvanceDays: { type: Number, required: true, min: 0, max: 730 },
    derived: {
      type: {
        _id: false,
        parentRatePlanId: { type: String, required: true },
        adjust: { _id: false, type: { type: String, enum: ADJUST_TYPES, required: true }, value: { type: Number, required: true } },
      },
      default: null,
    },
    order: { type: Number, default: 100 },
    status: { type: String, enum: RATE_PLAN_STATUSES, default: 'ACTIVE' },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const RatePlanRecord = defineTenantModel('InvRatePlan', schema, RATE_PLANS_COLLECTION, ['hotelOrgId']);
