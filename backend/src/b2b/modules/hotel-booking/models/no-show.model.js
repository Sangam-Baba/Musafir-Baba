// @ts-check
/**
 * No-shows (`hbk_no_shows`, plan Stage 09 §3.6): the hotel says the guest didn't come; the charge follows the booking's
 * no-show policy (copy kept at booking time). For 72 hours the buyer may dispute; MusafirBaba upholds or reverses.
 * Money moves only when it is final (window over, or upheld): the unused part refunded, the ledger settled pro rata.
 * Owned by the hotel company.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const NO_SHOWS_COLLECTION = 'hbk_no_shows';
export const NO_SHOW_STATUSES = /** @type {const} */ (['DISPUTE_WINDOW', 'DISPUTED', 'FINAL', 'REVERSED']);
export const DISPUTE_HOURS = 72;

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    markedBy: { type: String, required: true },
    markedAt: { type: Date, required: true },
    disputeUntil: { type: Date, required: true },
    chargePaise: { type: Number, required: true, min: 0 },
    refundPaise: { type: Number, required: true, min: 0 },
    status: { type: String, enum: NO_SHOW_STATUSES, required: true },
    dispute: { type: { at: Date, by: String, message: String }, default: null, _id: false },
    resolution: { type: { at: Date, by: String, decision: String, note: String }, default: null, _id: false },
    settled: { type: Boolean, default: false }, // ledger + refund done
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const NoShowRecord = defineTenantModel('HotelNoShow', schema, NO_SHOWS_COLLECTION, ['hotelOrgId']);
