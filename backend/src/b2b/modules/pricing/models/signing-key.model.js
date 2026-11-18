// @ts-check
/**
 * Price-token keys (`prc_signing_keys`): only the key id and its status — the key itself is derived from the server
 * secret and the id, so nothing secret is stored. One ACTIVE key signs; after a rotation the old one is
 * VERIFY_ONLY until every token it signed has expired (`verifyUntil`), then it no longer verifies.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const SIGNING_KEYS_COLLECTION = 'prc_signing_keys';
export const KEY_STATUSES = /** @type {const} */ (['ACTIVE', 'VERIFY_ONLY']);

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String, required: true },
    status: { type: String, enum: KEY_STATUSES, required: true },
    verifyUntil: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const SigningKeyRecord = defineModel('PricingSigningKey', schema, SIGNING_KEYS_COLLECTION);
