// @ts-check
/**
 * `org_invitations`: an invitation to join an org (plan Stage 01 §3.2). The emailed link holds
 * `<invitationId>.<secret>`; only a keyed hash of the secret is stored. 7 days, single use
 * (PENDING → ACCEPTED with one conditional update). One open invitation per org and email.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const INVITATIONS_COLLECTION = 'org_invitations';
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60_000;

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    email: { type: String, required: true },
    roles: { type: [String], required: true },
    branchIds: { type: [String], default: [] },
    propertyIds: { type: [String], default: [] },
    secretHash: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REVOKED'], default: 'PENDING' },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: String, required: true },
    acceptedBy: { type: String, default: null },
    acceptedAt: { type: Date, default: null },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const InvitationRecord = defineTenantModel('OrgInvitation', schema, INVITATIONS_COLLECTION, ['orgId']);
