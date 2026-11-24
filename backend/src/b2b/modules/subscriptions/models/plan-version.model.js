// @ts-check
/**
 * Plan versions (`sub_plan_versions`, plan Stage 13 §2, §3.1): each plan (`planKey`) has versions; a version is a
 * DRAFT until a **different** MusafirBaba person publishes it — then it is never changed again (the previous published
 * version becomes SUPERSEDED). Subscriptions point at the version they were started or renewed on, so a price edit
 * applies from the next renewal (or now, if admin chooses). RETIRED: no new subscriptions. Not tenant-owned.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';
import { LIMIT_BEHAVIOURS } from '../domain/plans.js';

export const PLAN_VERSIONS_COLLECTION = 'sub_plan_versions';
export const PLAN_VERSION_STATUSES = /** @type {const} */ (['DRAFT', 'PUBLISHED', 'SUPERSEDED', 'REJECTED', 'RETIRED']);

const schema = new b2bMongoose.Schema(
  {
    planKey: { type: String, required: true, maxlength: 20 },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: PLAN_VERSION_STATUSES, required: true },
    name: { type: String, required: true, maxlength: 60 },
    monthlyQueryLimit: { type: Number, required: true, min: 0 },
    pricePaise: { type: Number, required: true, min: 0 },
    limitBehaviour: { type: String, enum: LIMIT_BEHAVIOURS, required: true },
    overagePricePerQueryPaise: { type: Number, default: 0, min: 0 },
    trialDays: { type: Number, default: 0, min: 0 },
    nextPlanKey: { type: String, default: null },
    features: { type: { users: Number, branches: Number, api: Boolean, webhooks: Boolean }, required: true, _id: false },
    note: { type: String, default: null, maxlength: 500 },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const PlanVersionRecord = defineModel('PlanVersion', schema, PLAN_VERSIONS_COLLECTION);
