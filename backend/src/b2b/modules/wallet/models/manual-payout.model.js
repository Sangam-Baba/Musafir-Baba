// @ts-check
/**
 * Recorded hotel payouts (`wal_manual_payouts`, plan Stage 09 §3.9 — until Stage 15's payout runs): finance made a bank
 * transfer and records it (amount, UTR, date) against the hotel's ready-to-pay payables, which are locked at once; a
 * different person approves → ledger hotel payable → bank, payables PAID; a rejection unlocks them.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const MANUAL_PAYOUTS_COLLECTION = 'wal_manual_payouts';

const schema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    payableIds: { type: [String], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    utr: { type: String, required: true, maxlength: 40 },
    paidOn: { type: String, required: true }, // YYYY-MM-DD (bank date)
    note: { type: String, default: null, maxlength: 500 },
    status: { type: String, enum: ['PROPOSED', 'APPROVED', 'REJECTED'], required: true },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null, maxlength: 500 },
    transactionId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const ManualPayoutRecord = defineTenantModel('HotelManualPayout', schema, MANUAL_PAYOUTS_COLLECTION, ['hotelOrgId']);
