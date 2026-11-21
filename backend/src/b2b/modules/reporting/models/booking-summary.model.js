// @ts-check
/**
 * Booking summaries (`rpt_booking_summaries`, plan Stage 09 §3.1) — one row per booking, for fast lists of every product
 * and channel (website customers now; hotels, clients and admins later). Rebuilt from the order and its bookings
 * whenever an order or booking event arrives, so a full rebuild gives the same rows. Read-only copies — the order and
 * booking documents stay the truth. Owned by the buyer (one of `customerId` / `guestKey` / `clientOrgId`) and the hotel.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const BOOKING_SUMMARIES_COLLECTION = 'rpt_booking_summaries';
export const PAYMENT_STATES = /** @type {const} */ (['UNPAID', 'PAID', 'PARTLY_REFUNDED', 'REFUNDED']);

const schema = new b2bMongoose.Schema(
  {
    bookingRef: { type: String, required: true },
    orderRef: { type: String, required: true },
    orderId: { type: String, required: true },
    productType: { type: String, required: true }, // HOTEL (more products later)
    channel: { type: String, required: true },
    customerId: { type: String, default: null },
    guestKey: { type: String, default: null },
    clientOrgId: { type: String, default: null },
    branchId: { type: String, default: null }, // Stage 12
    createdBy: { type: String, default: null },
    hotelOrgId: { type: String, default: null },
    propertyId: { type: String, default: null },
    propertyName: { type: String, default: null },
    destination: { type: String, default: null },
    leadGuest: { type: String, default: null },
    checkIn: { type: String, default: null },
    checkOut: { type: String, default: null },
    bookingStatus: { type: String, required: true },
    orderStatus: { type: String, required: true },
    paymentState: { type: String, enum: PAYMENT_STATES, required: true },
    totalPaise: { type: Number, required: true },
    refundedPaise: { type: Number, default: 0 },
    orderCreatedAt: { type: Date, required: true },
    projectedAt: { type: Date, required: true },
  },
  { versionKey: false, strict: 'throw' },
);

export const BookingSummaryRecord = defineTenantModel('BookingSummary', schema, BOOKING_SUMMARIES_COLLECTION, [
  'customerId',
  'guestKey',
  'clientOrgId',
  'hotelOrgId',
]);
