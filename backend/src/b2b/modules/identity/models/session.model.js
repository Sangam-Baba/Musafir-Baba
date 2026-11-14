// @ts-check
/**
 * `id_sessions`: one document per login. The refresh token rotates on every use (`generation` + 1);
 * only hashes are stored. A token from an older generation = stolen copy → the session is revoked.
 * Owned by the user (tenant field `userId`).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const SESSIONS_COLLECTION = 'id_sessions';
export const LOGIN_METHODS = /** @type {const} */ (['password', 'email-otp', 'totp', 'recovery-code', 'invitation']);

const schema = new b2bMongoose.Schema(
  {
    userId: { type: String, required: true },
    orgId: { type: String, default: null },
    methods: { type: [String], enum: LOGIN_METHODS, required: true },
    generation: { type: Number, required: true },
    refreshHash: { type: String, required: true },
    previousHash: { type: String, default: null },
    rotatedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 300 },
    stepUpAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const SessionRecord = defineTenantModel('BusinessSession', schema, SESSIONS_COLLECTION, ['userId']);
