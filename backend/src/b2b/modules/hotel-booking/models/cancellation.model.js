// @ts-check
/**
 * Cancellations (`hbk_cancellations`, plan Stage 09 §3.4, §3.11 cancellations monitor): one per booking — the quote it
 * was made on (charge, refund, the hotel's share), who asked, and how far it got. The booking holds the state; this
 * record is what admins watch. Owned by the hotel company.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const CANCELLATIONS_COLLECTION = 'hbk_cancellations';

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    chargePaise: { type: Number, required: true, min: 0 },
    refundPaise: { type: Number, required: true, min: 0 },
    hotelSharePaise: { type: Number, required: true, min: 0 },
    requestedBy: { type: String, required: true },
    reason: { type: String, default: null, maxlength: 500 },
    status: { type: String, enum: ['CANCELLING', 'CANCELLED'], required: true },
    requestedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { versionKey: false, strict: 'throw' },
);

export const CancellationRecord = defineTenantModel('HotelCancellation', schema, CANCELLATIONS_COLLECTION, ['hotelOrgId']);
