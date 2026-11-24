// @ts-check
/**
 * API keys (`api_keys`, plan Stage 14 §3.1, §4): a client company's keys for its own software. Only the prefix and a
 * hash of the secret are kept — the full key is shown once. A key acts as the member who created it, cut down to its
 * scopes. Never deleted: revoked keys stay for the audit trail.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const API_KEYS_COLLECTION = 'api_keys';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    env: { type: String, enum: ['live', 'test'], required: true },
    prefix: { type: String, required: true },
    secretHash: { type: String, required: true },
    scopes: { type: [String], required: true },
    ipAllowList: { type: [String], default: [] },
    createdByUserId: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
    expiresAt: { type: Date, default: null }, // set on the old key when it is rotated (keeps working 24 h)
    revokedAt: { type: Date, default: null },
    revokedBy: { type: String, default: null },
    lastUsedAt: { type: Date, default: null },
    lastUsedIp: { type: String, default: null },
    knownIps: { type: [String], default: [] }, // the last 50 addresses it was used from (new-IP notice)
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const ApiKeyRecord = defineTenantModel('ApiKey', schema, API_KEYS_COLLECTION, ['orgId']);
