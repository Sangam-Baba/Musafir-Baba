// @ts-check
/**
 * Correcting entries waiting for a second person (`wal_adjustments`) — the only way to fix a balance. Proposed with
 * a reason code and balanced lines; approved by someone else → posted to the journal (reference `adjustment/<id>`).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const ADJUSTMENTS_COLLECTION = 'wal_adjustments';
export const REASON_CODES = /** @type {const} */ (['BANK_CHARGES', 'PAYU_DIFFERENCE', 'MISPOSTING', 'WRITE_OFF', 'OTHER']);

const schema = new b2bMongoose.Schema(
  {
    reasonCode: { type: String, enum: REASON_CODES, required: true },
    note: { type: String, required: true, maxlength: 500 },
    lines: {
      type: [new b2bMongoose.Schema({ accountId: String, debitPaise: Number, creditPaise: Number }, { _id: false })],
      required: true,
    },
    status: { type: String, enum: ['PROPOSED', 'POSTED', 'REJECTED'], required: true },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null, maxlength: 500 },
    transactionId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const AdjustmentRecord = defineModel('LedgerAdjustment', schema, ADJUSTMENTS_COLLECTION);
