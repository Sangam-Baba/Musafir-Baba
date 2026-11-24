// @ts-check
/**
 * `kyc_applications`: one verification application per organisation (plan Stage 02 §3.5–3.7).
 * Status: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED (→ edited → SUBMITTED again) — table in
 * domain/workflow.js. `history` is the timeline the hotel's status page shows.
 * `details` are the validated business details without the PAN; the PAN and the bank account number are
 * sealed in `sensitive` (S02-T07, ../sensitive.js). `gstin` is kept at the top level (public business data) to flag duplicates. Owned by the org.
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
    // S02-T07: sealed values (never returned by the API); `details.panLast4` / `bank.accountLast4` are what people see
    sensitive: {
      panSealed: { type: String, default: null },
      accountSealed: { type: String, default: null },
    },
    bank: {
      type: new b2bMongoose.Schema(
        {
          holderName: { type: String, required: true },
          ifsc: { type: String, required: true },
          accountLast4: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
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
    // every change by the hotel bumps it; submit only goes through on the revision it checked
    revision: { type: Number, default: 0 },
    round: { type: Number, default: 0 }, // how many times it was submitted
    history: {
      type: [
        {
          _id: false,
          at: { type: Date, required: true },
          action: { type: String, required: true },
          status: { type: String, required: true },
          by: { type: String, required: true },
          note: { type: String, default: null },
        },
      ],
      default: [],
    },
    // MusafirBaba review (S02-T08): who holds it (30-minute lock), a verdict per document file, first approval of a high-risk one
    review: {
      reviewerId: { type: String, default: null },
      lockedUntil: { type: Date, default: null },
      verdicts: {
        type: [
          {
            _id: false,
            key: { type: String, required: true },
            fileId: { type: String, required: true },
            verdict: { type: String, enum: ['VERIFIED', 'MISMATCH', 'UNREADABLE'], required: true },
            note: { type: String, default: null },
            by: { type: String, required: true },
            at: { type: Date, required: true },
          },
        ],
        default: [],
      },
      firstApproval: {
        type: new b2bMongoose.Schema(
          { by: { type: String, required: true }, at: { type: Date, required: true }, note: { type: String, default: null } },
          { _id: false },
        ),
        default: null,
      },
      decisionNote: { type: String, default: null },
    },
    // S03-T03a: further GSTINs of the same business (same PAN), one per state; each verified on its own
    gstRegistrations: {
      type: [
        new b2bMongoose.Schema(
          {
            stateCode: { type: String, required: true },
            gstin: { type: String, required: true },
            fileId: { type: String, required: true }, // its GST certificate
            status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
            duplicate: { type: Boolean, default: false }, // the GSTIN is also on another organisation's application
            note: { type: String, default: null },
            addedBy: { type: String, required: true },
            addedAt: { type: Date, required: true },
            decidedBy: { type: String, default: null },
            decidedAt: { type: Date, default: null },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
    remindedAt: { type: Date, default: null }, // S02-T11: unfinished-registration reminder sent
    bankChangedAt: { type: Date, default: null }, // Stage 15: payouts held for 72 hours after a bank change
    submittedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const ApplicationRecord = defineTenantModel('KycApplication', schema, APPLICATIONS_COLLECTION, ['orgId']);
