// @ts-check
/**
 * Refunds (`pay_refunds`): to the source (the PayU payment). `refundId` is ours and goes to PayU, so asking again
 * never refunds twice. One refund per intent + `key` (e.g. `late-success`, `cancel:<booking>`), so a repeated request
 * returns the first. REQUESTED → PENDING (PayU accepted) → SUCCEEDED | FAILED; the poller follows it to the end.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineModel } from '../../../core/db/model.js';

export const REFUNDS_COLLECTION = 'pay_refunds';
export const REFUND_STATUSES = /** @type {const} */ (['REQUESTED', 'PENDING', 'SUCCEEDED', 'FAILED']);

const schema = new b2bMongoose.Schema(
  {
    refundId: { type: String, required: true },
    intentId: { type: String, required: true },
    txnId: { type: String, required: true },
    key: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, maxlength: 300 },
    destination: { type: String, enum: ['SOURCE', 'WALLET'], default: 'SOURCE' },
    status: { type: String, enum: REFUND_STATUSES, required: true },
    gatewayRequestId: { type: String, default: null },
    gatewayMessage: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lastCheckedAt: { type: Date, default: null },
    journalPosted: { type: Boolean, default: false },
    requestedBy: { type: String, required: true },
    history: { type: [{ _id: false, at: Date, status: String, note: { type: String, default: null } }], default: [] },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const RefundRecord = defineModel('PaymentRefund', schema, REFUNDS_COLLECTION);
