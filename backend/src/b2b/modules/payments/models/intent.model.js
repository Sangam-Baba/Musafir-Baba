// @ts-check
/**
 * Payment intents (`pay_intents`): one per attempt to collect money through PayU. The amount is ours (never the
 * browser's); `txnId` is what PayU sees (B2BH… / B2BW… / B2BS… / B2BT… for admin tests). Statuses
 * CREATED → PENDING → SUCCEEDED | FAILED, then REFUNDED. Events are stored with each change; `journalPosted` marks the
 * ledger entry for a success (finished by the poller if a run was cut short).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineModel } from '../../../core/db/model.js';

export const INTENTS_COLLECTION = 'pay_intents';
export const INTENT_STATUSES = /** @type {const} */ (['CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED']);
export const INTENT_PURPOSES = /** @type {const} */ (['ORDER', 'TOPUP', 'SUBSCRIPTION', 'TEST']);

const schema = new b2bMongoose.Schema(
  {
    txnId: { type: String, required: true },
    purpose: { type: String, enum: INTENT_PURPOSES, required: true },
    reference: {
      type: new b2bMongoose.Schema({ type: { type: String, required: true }, id: { type: String, required: true } }, { _id: false }),
      required: true,
    },
    orgId: { type: String, default: null }, // B2B client (orders / top-ups / plans); null for website customers
    customerId: { type: String, default: null },
    amountPaise: { type: Number, required: true, min: 1 },
    productinfo: { type: String, required: true, maxlength: 100 },
    payer: { type: new b2bMongoose.Schema({ firstname: String, email: String, phone: String }, { _id: false }), required: true },
    returnUrl: { type: String, required: true }, // where the browser goes after PayU (our website / dashboard)
    status: { type: String, enum: INTENT_STATUSES, required: true },
    failureReason: { type: String, default: null },
    gatewayPaymentId: { type: String, default: null }, // PayU mihpayid
    mode: { type: String, default: null },
    windowEndsAt: { type: Date, required: true }, // after this an unpaid intent is abandoned
    lastVerifiedAt: { type: Date, default: null },
    verifyAttempts: { type: Number, default: 0 },
    journalPosted: { type: Boolean, default: false },
    refundedPaise: { type: Number, default: 0 },
    refundIds: { type: [String], default: [] }, // refunds that reserved part of this payment (each once)
    createdBy: { type: String, required: true },
    version: { type: Number, default: 1 },
    history: { type: [{ _id: false, at: Date, status: String, source: String, note: { type: String, default: null } }], default: [] },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const IntentRecord = defineModel('PaymentIntent', schema, INTENTS_COLLECTION);
