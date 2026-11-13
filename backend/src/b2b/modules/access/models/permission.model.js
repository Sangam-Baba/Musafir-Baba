// @ts-check
/**
 * `acl_permissions`: a stored copy of the permission catalogue (code → group, description, org types,
 * sensitive). The code is the source of truth; this copy is for admin screens and reports. Codes that
 * disappear from the catalogue are kept and marked `retired` (old audit entries still refer to them).
 * Platform-wide data — no tenant.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const PERMISSIONS_COLLECTION = 'acl_permissions';

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String },
    group: { type: String, required: true },
    description: { type: String, required: true },
    orgTypes: { type: [String], required: true },
    sensitive: { type: Boolean, required: true },
    retired: { type: Boolean, default: false },
    syncedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export const PermissionRecord = defineModel('PermissionRecord', schema, PERMISSIONS_COLLECTION);
