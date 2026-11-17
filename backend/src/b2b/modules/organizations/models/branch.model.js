// @ts-check
/** `org_branches`: offices of a B2B client (bookings can be limited to branches). Owned by the org. */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const BRANCHES_COLLECTION = 'org_branches';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 120 },
    city: { type: String, default: null, maxlength: 80 },
    stateCode: { type: String, default: null, match: /^\d{2}$/ },
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
  },
  { timestamps: true, versionKey: false },
);

export const BranchRecord = defineTenantModel('Branch', schema, BRANCHES_COLLECTION, ['orgId']);
