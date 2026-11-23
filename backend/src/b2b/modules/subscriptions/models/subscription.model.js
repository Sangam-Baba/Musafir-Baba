// @ts-check
/**
 * Subscriptions (`sub_subscriptions`, plan Stage 13 §3.2) — one per B2B client:
 * - the plan and the exact version it runs on, the current period (calendar month in India) and its status:
 *   TRIAL → ACTIVE ⇄ PAST_DUE → SUSPENDED (unpaid; paid features off) → ACTIVE on payment; CANCELLED at period end;
 * - `pending`: a downgrade / cancel waiting for the next period; `trialEndsAt`;
 * - this period's extras: query top-ups and prorated adjustments from an upgrade (`charges` — fee lines the next
 *   invoice picks up, each once), and the queries included this month after proration (`includedQueries`);
 * - `override`: a client-specific limit / price / behaviour (approved by two people, optional expiry);
 * - `version`: every change is conditional on it (two changes at once → one wins).
 * Owned by the client.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const SUBSCRIPTIONS_COLLECTION = 'sub_subscriptions';
export const SUBSCRIPTION_STATUSES = /** @type {const} */ (['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED']);

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    planKey: { type: String, required: true },
    planVersionId: { type: String, required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true },
    period: { type: String, required: true }, // YYYY-MM (India)
    trialEndsAt: { type: Date, default: null },
    includedQueries: { type: Number, required: true, min: 0 }, // this period, after proration
    extraQueries: { type: Number, default: 0, min: 0 }, // approved top-ups this period
    pending: { type: { action: String, planKey: String, at: String }, default: null, _id: false }, // DOWNGRADE | CANCEL, from period
    charges: {
      type: [{ _id: false, id: String, kind: String, description: String, amountPaise: Number, period: String, at: Date }],
      default: [],
    },
    override: {
      type: {
        queryLimit: Number,
        pricePaise: Number,
        limitBehaviour: String,
        overagePricePerQueryPaise: Number,
        expiresAt: Date,
        approvedId: String,
      },
      default: null,
      _id: false,
    },
    alerts: { type: { period: String, sent: [Number] }, default: () => ({ period: '', sent: [] }), _id: false }, // 80 / 100 % sent this period
    pastDueSince: { type: Date, default: null },
    history: { type: [{ _id: false, at: Date, what: String, by: String }], default: [] },
    version: { type: Number, default: 0 },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const SubscriptionRecord = defineTenantModel('Subscription', schema, SUBSCRIPTIONS_COLLECTION, ['clientOrgId']);
