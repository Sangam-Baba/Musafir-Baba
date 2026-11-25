// @ts-check
/**
 * `acl_roles`: custom roles an org creates (system roles live in code — domain/system-roles.js).
 * Members refer to them as `custom:<id>`. Names are unique per org (case-insensitive) among active roles.
 * Owned by the org.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ROLES_COLLECTION = 'acl_roles';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    orgType: { type: String, enum: ['CLIENT', 'HOTEL', 'BUS_OPERATOR'], required: true },
    name: { type: String, required: true, maxlength: 60 },
    nameKey: { type: String, required: true },
    description: { type: String, default: '', maxlength: 300 },
    permissions: { type: [String], required: true },
    status: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' },
    createdBy: { type: String, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const RoleRecord = defineTenantModel('CustomRole', schema, ROLES_COLLECTION, ['orgId']);
