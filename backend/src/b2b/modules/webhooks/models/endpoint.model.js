// @ts-check
/**
 * Webhook endpoints (`whk_endpoints`, plan Stage 14 §4): where a client company's booking updates are sent. The
 * signing secret is stored sealed (AES-256-GCM) and shown once; after a rotation the previous secret keeps signing
 * too until `previousValidUntil`. `failingSince` drives the 24-hour auto-disable.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ENDPOINTS_COLLECTION = 'whk_endpoints';
export const ENDPOINT_STATUSES = /** @type {const} */ (['ACTIVE', 'DISABLED', 'DELETED']);

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    url: { type: String, required: true, maxlength: 500 },
    description: { type: String, default: null, maxlength: 200 },
    events: { type: [String], required: true },
    secretEnc: { type: String, required: true },
    previousSecretEnc: { type: String, default: null },
    previousValidUntil: { type: Date, default: null },
    status: { type: String, enum: ENDPOINT_STATUSES, default: 'ACTIVE' },
    disabledReason: { type: String, default: null },
    failingSince: { type: Date, default: null },
    createdBy: { type: String, required: true },
    version: { type: Number, default: 1 },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const EndpointRecord = defineTenantModel('WebhookEndpoint', schema, ENDPOINTS_COLLECTION, ['orgId']);
