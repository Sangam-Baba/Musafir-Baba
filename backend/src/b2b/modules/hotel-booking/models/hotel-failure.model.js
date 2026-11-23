// @ts-check
/**
 * Hotels that can't honour a booking (`hbk_hotel_failures`, plan Stage 09 §3.7) — overbooked, closed, … Reported by the
 * hotel or MusafirBaba; resolved by MusafirBaba: a full refund to the buyer, or the guest moved to another hotel
 * (arranged by the team; what the first hotel was owed moves to suspense for finance to settle). Penalties against the
 * hotel go through Finance → Corrections (two people). Owned by the hotel company.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const HOTEL_FAILURES_COLLECTION = 'hbk_hotel_failures';
export const HOTEL_FAILURE_STATUSES = /** @type {const} */ (['OPEN', 'REFUNDED', 'RELOCATED']);

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    reportedBy: { type: String, required: true },
    reportedAt: { type: Date, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: HOTEL_FAILURE_STATUSES, required: true },
    resolution: { type: { at: Date, by: String, action: String, note: String, alternativeRef: String }, default: null, _id: false },
    settled: { type: Boolean, default: false },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const HotelFailureRecord = defineTenantModel('HotelFailure', schema, HOTEL_FAILURES_COLLECTION, ['hotelOrgId']);
