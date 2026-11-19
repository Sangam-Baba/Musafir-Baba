// @ts-check
/**
 * Money differences for finance to look at (`pay_recon_exceptions`): wrong amount from PayU, a payment after its
 * window, settlement lines that don't match (S07-T09). Open until someone resolves it with a note.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const RECON_EXCEPTIONS_COLLECTION = 'pay_recon_exceptions';

const schema = new b2bMongoose.Schema(
  {
    kind: { type: String, required: true }, // AMOUNT_MISMATCH | LATE_SUCCESS | SETTLEMENT_UNMATCHED | SETTLEMENT_AMOUNT | REFUND_FAILED …
    key: { type: String, required: true }, // one exception per kind + key (repeat-safe)
    txnId: { type: String, default: null },
    detail: { type: String, required: true, maxlength: 500 },
    amountPaise: { type: Number, default: null },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
    resolvedBy: { type: String, default: null },
    resolution: { type: String, default: null, maxlength: 500 },
    raisedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const ReconExceptionRecord = defineModel('PaymentReconException', schema, RECON_EXCEPTIONS_COLLECTION);
