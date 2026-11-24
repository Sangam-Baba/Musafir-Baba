// @ts-check
/**
 * Webhook deliveries (`whk_deliveries`, plan Stage 14 §4): one per event per endpoint (a replay is a new row with the
 * same event id). The public payload is kept so every try — and a replay — sends exactly the same body.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const DELIVERIES_COLLECTION = 'whk_deliveries';
export const DELIVERY_STATUSES = /** @type {const} */ (['PENDING', 'SENDING', 'SUCCEEDED', 'FAILED']);

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    endpointId: { type: String, required: true },
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: b2bMongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: DELIVERY_STATUSES, default: 'PENDING' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    responseCode: { type: Number, default: null },
    responseSnippet: { type: String, default: null, maxlength: 1024 },
    error: { type: String, default: null },
    replayOf: { type: String, default: null },
    tries: { type: [{ _id: false, at: Date, code: Number, error: String, ms: Number }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const DeliveryRecord = defineTenantModel('WebhookDelivery', schema, DELIVERIES_COLLECTION, ['orgId']);
