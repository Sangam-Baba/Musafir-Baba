// @ts-check
/**
 * GST rates as dated data (`prc_tax_rules`) — platform-wide (MusafirBaba's own data, no tenant). A rate is never
 * edited in place: a change is a new rule that a different admin approves (S05-T07); seeded rules are ACTIVE.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';
import { TAX_KINDS } from '../domain/tax.js';

export const TAX_RULES_COLLECTION = 'prc_tax_rules';
export const TAX_RULE_STATUSES = /** @type {const} */ (['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'RETIRED']);

const schema = new b2bMongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 80 },
    appliesTo: { type: String, enum: TAX_KINDS, required: true },
    sac: { type: String, required: true, maxlength: 6 },
    slabMinPaise: { type: Number, required: true, min: 0 },
    slabMaxPaise: { type: Number, default: null, min: 0 },
    rateBps: { type: Number, required: true, min: 0 },
    itcAllowed: { type: Boolean, required: true },
    effectiveFrom: { type: String, required: true },
    effectiveTo: { type: String, default: null },
    sourceNote: { type: String, required: true, maxlength: 300 },
    status: { type: String, enum: TAX_RULE_STATUSES, required: true },
    proposedBy: { type: String, required: true },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const TaxRuleRecord = defineModel('PricingTaxRule', schema, TAX_RULES_COLLECTION);
