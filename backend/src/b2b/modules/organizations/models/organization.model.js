// @ts-check
/**
 * `org_organizations`: a B2B client company or a hotel company (docs/plan/04-domain-model.md §2).
 * KYC fields (GSTIN, PAN, address) are added in Stage 02 / 10. The tenant field is the org's own `_id`.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ORGS_COLLECTION = 'org_organizations';
export const ORG_STATUSES = /** @type {const} */ (['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']);
/** Members of orgs in these statuses can sign in to them (onboarding hotels must reach KYC). */
export const USABLE_ORG_STATUSES = /** @type {const} */ (['ONBOARDING', 'ACTIVE']);

const schema = new b2bMongoose.Schema(
  {
    type: { type: String, enum: ['PLATFORM', 'CLIENT', 'HOTEL', 'BUS_OPERATOR'], required: true },
    reference: { type: String, required: true },
    legalName: { type: String, required: true, maxlength: 200 },
    displayName: { type: String, required: true, maxlength: 120 },
    status: { type: String, enum: ORG_STATUSES, required: true },
    statusReason: { type: String, default: null, maxlength: 500 },
    clientCategory: { type: String, default: null }, // Stage 10: B2B clients only — key of org_client_categories
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const OrganizationRecord = defineTenantModel('Organization', schema, ORGS_COLLECTION, ['_id']);
