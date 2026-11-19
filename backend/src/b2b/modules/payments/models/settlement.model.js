// @ts-check
/**
 * PayU settlement lines for the new system's transactions (`pay_settlements`) — one per PayU payment id + action
 * (capture / refund). Lines for other transactions on the same merchant account (the existing website's `txn…`,
 * `MBG…` …) are never stored. `matched` once it agrees with our payment / refund; its ledger entries posted once.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const SETTLEMENTS_COLLECTION = 'pay_settlements';

const schema = new b2bMongoose.Schema(
  {
    key: { type: String, required: true }, // mihpayid:action
    txnId: { type: String, required: true },
    mihpayid: { type: String, required: true },
    action: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    feePaise: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0 },
    settledPaise: { type: Number, default: 0 },
    utr: { type: String, default: null },
    settledOn: { type: String, required: true },
    source: { type: String, enum: ['API', 'FILE'], required: true },
    matched: { type: Boolean, default: false },
    journalPosted: { type: Boolean, default: false },
    importedAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false },
);

export const SettlementRecord = defineModel('PaymentSettlement', schema, SETTLEMENTS_COLLECTION);
