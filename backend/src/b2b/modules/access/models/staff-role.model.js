// @ts-check
/**
 * `acl_staff_roles`: which platform roles (Super Admin, Operations, Finance, Hotels/Contracting,
 * Support) a MusafirBaba staff member has in the B2B system (plan Stage 01 §3.6, D1). Keyed by the
 * existing staff id; the existing `staffs` collection is never written. `firstGrantedAt` starts the
 * 7-day window for setting up two-step login. Platform data — no tenant.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const STAFF_ROLES_COLLECTION = 'acl_staff_roles';

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String },
    roles: { type: [String], required: true },
    firstGrantedAt: { type: Date, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const StaffRoleRecord = defineModel('StaffRole', schema, STAFF_ROLES_COLLECTION);
