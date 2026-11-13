// @ts-check
/**
 * `id_users`: business users (team members of client, hotel and platform orgs). A user can belong to
 * several orgs (memberships live in the organizations module), so this collection has no tenant field.
 * Website customers (`users`) and admins (`staffs`) are NOT here — they stay in the existing app.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineModel } from '../../../core/db/model.js';

export const USERS_COLLECTION = 'id_users';
export const USER_STATUSES = /** @type {const} */ (['ACTIVE', 'DISABLED']);

const schema = new b2bMongoose.Schema(
  {
    email: { type: String, default: undefined },
    phone: { type: String, default: undefined },
    name: { type: String, required: true, maxlength: 120 },
    passwordHash: { type: String, default: undefined },
    passwordChangedAt: { type: Date, default: undefined },
    emailVerifiedAt: { type: Date, default: undefined },
    phoneVerifiedAt: { type: Date, default: undefined },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    failedLogins: {
      count: { type: Number, default: 0 },
      lockedUntil: { type: Date, default: null },
    },
    lastLoginAt: { type: Date, default: undefined },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const UserRecord = defineModel('BusinessUser', schema, USERS_COLLECTION);
