// @ts-check
/**
 * Overrides and query top-ups (`sub_overrides`, plan Stage 13 §3.2, §3.4, §7 "override abuse") — proposed by one
 * MusafirBaba person, approved by a **different** one, then applied to the client's subscription once (`applied`):
 * OVERRIDE = a client-specific limit / price / behaviour until `expiresAt`; TOPUP = extra queries for this period.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const OVERRIDES_COLLECTION = 'sub_overrides';

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    kind: { type: String, enum: ['OVERRIDE', 'TOPUP'], required: true },
    terms: {
      type: { queryLimit: Number, pricePaise: Number, limitBehaviour: String, overagePricePerQueryPaise: Number, expiresAt: Date },
      default: null,
      _id: false,
    },
    queries: { type: Number, default: 0, min: 0 },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ['PROPOSED', 'APPROVED', 'REJECTED'], required: true },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    applied: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const OverrideRecord = defineTenantModel('SubscriptionOverride', schema, OVERRIDES_COLLECTION, ['clientOrgId']);
