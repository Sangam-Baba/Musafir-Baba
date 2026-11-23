// @ts-check
/**
 * Credit lines (`wal_credit_lines`, plan Stage 11 §3.6, D9): a limit and due days for one client, proposed by one
 * MusafirBaba finance person and approved by a **different** one. The approved line is copied onto the client's wallet
 * (`creditLimitPaise`, `creditDueDays`, `creditLineId`) — that copy is what bookings check. A newer approval supersedes
 * the old line; a limit of 0 switches credit off. Owned by the client.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const CREDIT_LINES_COLLECTION = 'wal_credit_lines';
export const CREDIT_LINE_STATUSES = /** @type {const} */ (['PROPOSED', 'APPROVED', 'REJECTED', 'SUPERSEDED']);

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    limitPaise: { type: Number, required: true, min: 0 },
    dueDays: { type: Number, required: true, min: 1, max: 90 },
    note: { type: String, default: null, maxlength: 500 },
    status: { type: String, enum: CREDIT_LINE_STATUSES, required: true },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null, maxlength: 500 },
    applied: { type: Boolean, default: false }, // copied onto the wallet
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const CreditLineRecord = defineTenantModel('WalletCreditLine', schema, CREDIT_LINES_COLLECTION, ['clientOrgId']);
