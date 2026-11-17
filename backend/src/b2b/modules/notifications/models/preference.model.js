// @ts-check
/**
 * `ntf_preferences`: a user's choices per category (plan 11 §10). No row = the defaults (everything on).
 * Critical categories ignore this (they can't be switched off). Owned by the user.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const PREFERENCES_COLLECTION = 'ntf_preferences';

const schema = new b2bMongoose.Schema(
  {
    userId: { type: String, required: true },
    category: { type: String, required: true },
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const PreferenceRecord = defineTenantModel('NotificationPreference', schema, PREFERENCES_COLLECTION, ['userId']);
