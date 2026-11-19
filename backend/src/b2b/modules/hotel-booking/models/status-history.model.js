// @ts-check
/**
 * Booking status history (`hbk_status_history`): one row per status change, append-only (written after the change it
 * describes — a missing row is harmless, the booking holds the truth). Owned by the hotel company.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const STATUS_HISTORY_COLLECTION = 'hbk_status_history';

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    from: { type: String, default: null },
    to: { type: String, required: true },
    at: { type: Date, required: true },
    by: { type: String, required: true },
    note: { type: String, default: null, maxlength: 500 },
  },
  { versionKey: false, strict: 'throw' },
);

export const BookingStatusRecord = defineTenantModel('HotelBookingStatus', schema, STATUS_HISTORY_COLLECTION, ['hotelOrgId']);
