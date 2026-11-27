// @ts-check
/**
 * Margin rules (`prc_margin_rules`) — platform-wide (MusafirBaba's own data, no tenant). Statuses
 * DRAFT → PENDING_APPROVAL → ACTIVE → RETIRED; an ACTIVE rule is never edited (a change is a new rule that
 * replaces it on approval — S05-T04). Seeded defaults carry a `key`. `history` is append-only and written in the
 * same update as each change (who, what, when, note), so a change never exists without its history line. Events
 * (rule activated / retired) are stored with the change and relayed. `version` guards against lost updates.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineModel } from '../../../core/db/model.js';
import { ADJUSTMENTS, CHANNELS, PRODUCT_TYPES } from '../domain/margin.js';

export const MARGIN_RULES_COLLECTION = 'prc_margin_rules';
export const MARGIN_RULE_STATUSES = /** @type {const} */ (['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'RETIRED']);

const match = new b2bMongoose.Schema(
  {
    channels: { type: [{ type: String, enum: CHANNELS }], default: undefined },
    clientCategory: { type: String, maxlength: 40 },
    clientOrgId: { type: String },
    hotelOrgId: { type: String },
    propertyId: { type: String },
    cityId: { type: String },
    starRating: { type: Number },
    stayFrom: { type: String },
    stayTo: { type: String },
    productType: { type: String, enum: PRODUCT_TYPES }, // Stage 18: absent = HOTEL
    operatorOrgId: { type: String },
    routeId: { type: String },
  },
  { _id: false },
);

const adjustment = new b2bMongoose.Schema(
  {
    type: { type: String, enum: ADJUSTMENTS, required: true },
    value: { type: Number, required: true },
    minPaise: { type: Number, default: null },
    maxPaise: { type: Number, default: null },
  },
  { _id: false },
);

const schema = new b2bMongoose.Schema(
  {
    key: { type: String, default: null },
    name: { type: String, required: true, maxlength: 80 },
    note: { type: String, default: null, maxlength: 500 },
    priority: { type: Number, required: true },
    match: { type: match, default: () => ({}) },
    adjustment: { type: adjustment, required: true },
    allowBelowNet: { type: Boolean, default: false },
    effectiveFrom: { type: Date, default: null },
    effectiveTo: { type: Date, default: null },
    status: { type: String, enum: MARGIN_RULE_STATUSES, required: true },
    replaces: { type: String, default: null },
    createdBy: { type: String, required: true },
    submittedBy: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    retiredBy: { type: String, default: null },
    retiredAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    history: {
      type: [
        {
          _id: false,
          at: { type: Date, required: true },
          action: { type: String, required: true },
          by: { type: String, required: true },
          note: { type: String, default: null },
          status: { type: String, required: true },
        },
      ],
      default: [],
    },
    ...eventFields(b2bMongoose), // pricing.rule.activated / retired
  },
  { timestamps: true, versionKey: false },
);

export const MarginRuleRecord = defineModel('PricingMarginRule', schema, MARGIN_RULES_COLLECTION);
