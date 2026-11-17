// @ts-check
/**
 * `id_otp_codes`: one-time codes sent by email (login, password reset). Only a keyed hash is stored;
 * 10 minutes, at most 5 guesses, one active code per user and purpose. Owned by the user.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const OTP_COLLECTION = 'id_otp_codes';
export const OTP_PURPOSES = /** @type {const} */ (['login', 'reset']);

const schema = new b2bMongoose.Schema(
  {
    userId: { type: String, required: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const OtpRecord = defineTenantModel('BusinessOtpCode', schema, OTP_COLLECTION, ['userId']);
