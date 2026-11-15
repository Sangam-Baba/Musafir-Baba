// @ts-check
/**
 * `kyc_applications`: one verification application per organisation (plan Stage 02 §3.5–3.7).
 * Status: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED (→ edited → SUBMITTED again).
 * `details` are the validated business details; PAN and bank numbers get field-level encryption in
 * S02-T07. `gstin` is kept at the top level (public business data) to flag duplicates. Owned by the org.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const APPLICATIONS_COLLECTION = 'kyc_applications';
export const APPLICATION_STATUSES = /** @type {const} */ (['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']);

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    orgType: { type: String, enum: ['CLIENT', 'HOTEL'], required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'DRAFT' },
    details: { type: b2bMongoose.Schema.Types.Mixed, default: null },
    gstRegistered: { type: Boolean, default: null },
    gstin: { type: String, default: null },
    documents: {
      type: [
        {
          _id: false,
          key: { type: String, required: true },
          fileId: { type: String, required: true },
          attachedAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    risk: { flags: { type: [String], default: [] }, highRisk: { type: Boolean, default: false } },
    submittedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const ApplicationRecord = defineTenantModel('KycApplication', schema, APPLICATIONS_COLLECTION, ['orgId']);
