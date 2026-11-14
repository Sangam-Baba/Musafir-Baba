// @ts-check
/**
 * `id_mfa`: a business user's authenticator-app setup (one document per user). The TOTP secret is
 * stored SEALED (AES-256-GCM, core/crypto.js); recovery codes as keyed hashes. `lastUsedStep` blocks
 * using the same code twice. Owned by the user.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const MFA_COLLECTION = 'id_mfa';

const schema = new b2bMongoose.Schema(
  {
    userId: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE'], required: true },
    secretSealed: { type: String, required: true },
    lastUsedStep: { type: Number, default: null },
    recoveryCodes: { type: [{ _id: false, hash: { type: String, required: true }, usedAt: { type: Date, default: null } }], default: [] },
    enabledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const MfaRecord = defineTenantModel('BusinessMfa', schema, MFA_COLLECTION, ['userId']);
