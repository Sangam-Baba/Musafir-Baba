// @ts-check
/**
 * `inv_cancellation_policies`: a property's reusable cancellation rules (plan Stage 04 §3.2). Owned by the
 * hotel org, always read through the property (property limits). A name once per property among active ones.
 * Policies are never deleted — archived (bookings keep a copy of the policy they were sold with).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { PENALTY_TYPES } from '../domain/cancellation.js';

export const CANCELLATION_POLICIES_COLLECTION = 'inv_cancellation_policies';

const penalty = {
  _id: false,
  type: { type: String, enum: PENALTY_TYPES, required: true },
  value: { type: Number, required: true },
};

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    nameKey: { type: String, required: true },
    nonRefundable: { type: Boolean, required: true },
    rules: { type: [{ _id: false, hoursBefore: { type: Number, required: true }, penalty }], default: [] },
    noShow: penalty,
    summary: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const CancellationPolicyRecord = defineTenantModel('InvCancellationPolicy', schema, CANCELLATION_POLICIES_COLLECTION, [
  'hotelOrgId',
]);
