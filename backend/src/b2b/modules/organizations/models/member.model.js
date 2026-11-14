// @ts-check
/**
 * `org_members`: a business user's membership of an org, with their roles and limits
 * (docs/plan/04-domain-model.md §2). `roles` = system role keys (e.g. 'client.bookingAgent') or custom
 * role ids (S01-T10). Empty `branchIds` = all branches; `propertyIds` limit hotel staff; `ownOnly` =
 * only records they created. Owned by the org AND the user (either scopes a query).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const MEMBERS_COLLECTION = 'org_members';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    userId: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'DISABLED', 'REMOVED'], default: 'ACTIVE' },
    roles: { type: [String], default: [] },
    branchIds: { type: [String], default: [] },
    propertyIds: { type: [String], default: [] },
    ownOnly: { type: Boolean, default: false },
    joinedAt: { type: Date, required: true },
    removedAt: { type: Date, default: null },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const MemberRecord = defineTenantModel('OrgMember', schema, MEMBERS_COLLECTION, ['orgId', 'userId']);
