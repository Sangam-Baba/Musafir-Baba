// @ts-check
/**
 * Orders (`ord_orders`). Owned by several parties at once (tenant guard ownership fields): the buyer — a B2B client
 * (`clientOrgId`), a website customer (`customerId`) or a guest (`guestKey`, the fingerprint of the private link's
 * key) — and every hotel company of its items (`hotelOrgIds`). Only one buyer field is set.
 * Money is the server's price at the time (never the browser's). Items point at their bookings; the payment block
 * records the PayU intent and whether PayU verified it. Status history and events live in the same document.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { stateFields } from '../../../core/db/transition.js';
import { ITEM_TYPES, ORDER_CHANNELS, ORDER_STATUSES, PAYMENT_MODES } from '../domain/order.js';

export const ORDERS_COLLECTION = 'ord_orders';

const item = new b2bMongoose.Schema(
  {
    type: { type: String, enum: ITEM_TYPES, required: true },
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    holdId: { type: String, default: null },
    totalPaise: { type: Number, required: true, min: 0 },
    gstPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const schema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    channel: { type: String, enum: ORDER_CHANNELS, required: true },
    clientOrgId: { type: String, default: null },
    customerId: { type: String, default: null },
    guestKey: { type: String, default: null }, // fingerprint of the guest's browser session
    hotelOrgIds: { type: [String], default: [] },
    createdBy: { type: String, required: true }, // customer:<id> | guest | user:<id> | staff:<id>
    idempotency: { type: { scope: String, key: String }, required: true, _id: false },
    tokenHash: { type: String, required: true }, // the price token(s) it was made from (duplicate guard)
    ip: { type: String, default: null },
    contact: { type: { name: String, email: String, phone: String }, required: true, _id: false },
    items: { type: [item], default: [] },
    totalPaise: { type: Number, required: true, min: 0 },
    gstPaise: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    holdExpiresAt: { type: Date, default: null },
    holdExtended: { type: Boolean, default: false },
    payment: {
      type: new b2bMongoose.Schema(
        {
          intentId: { type: String, default: null },
          txnId: { type: String, default: null },
          windowEndsAt: { type: Date, default: null },
          attempts: { type: Number, default: 0 },
          verified: { type: Boolean, default: false }, // PayU's verify API confirmed it (never the browser)
          verifiedIntentId: { type: String, default: null },
          gatewayPaymentId: { type: String, default: null },
          refundKey: { type: String, default: null },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    journalPosted: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    failure: { type: { code: String, detail: b2bMongoose.Schema.Types.Mixed }, default: null, _id: false },
    history: {
      type: [{ _id: false, at: Date, status: String, by: String, note: { type: String, default: null } }],
      default: [],
    },
    ...stateFields(b2bMongoose, ORDER_STATUSES),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const OrderRecord = defineTenantModel('Order', schema, ORDERS_COLLECTION, ['clientOrgId', 'customerId', 'guestKey', 'hotelOrgIds']);
