// @ts-check
/**
 * Every PayU message we receive (`pay_webhook_inbox`): browser returns now, polls too. One row per `txnId + status`
 * (repeats are dropped); whether its hash was valid; when it was processed. Only the few fields we use are kept —
 * never card details (PayU's hosted page keeps those).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const INBOX_COLLECTION = 'pay_webhook_inbox';

const schema = new b2bMongoose.Schema(
  {
    dedupeKey: { type: String, required: true },
    txnId: { type: String, required: true },
    source: { type: String, enum: ['CALLBACK', 'WEBHOOK', 'POLL'], required: true },
    status: { type: String, default: null },
    hashValid: { type: Boolean, required: true },
    amount: { type: String, default: null },
    mihpayid: { type: String, default: null },
    receivedAt: { type: Date, required: true },
    processedAt: { type: Date, default: null },
  },
  { timestamps: false, versionKey: false },
);

export const PaymentInboxRecord = defineModel('PaymentInbox', schema, INBOX_COLLECTION);
