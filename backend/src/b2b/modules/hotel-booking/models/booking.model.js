// @ts-check
/**
 * Hotel bookings (`hbk_bookings`, plan Stage 08 §3.2). Owned by the hotel company (`hotelOrgId`) and the buyer (one of
 * `clientOrgId` / `customerId` / `guestKey`). Keeps copies (snapshots) that never change once confirmed: the property
 * (name, address, time zone, check-in time), the room type and rate plan names, the cancellation terms and the full
 * price breakdown (hotel rate, margin, GST per night — internal; buyers and hotels see their own views only).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { stateFields } from '../../../core/db/transition.js';
import { BOOKING_STATUSES } from '../domain/booking.js';

export const BOOKINGS_COLLECTION = 'hbk_bookings';

const Mixed = b2bMongoose.Schema.Types.Mixed;

const schema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    channel: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    clientOrgId: { type: String, default: null },
    customerId: { type: String, default: null },
    guestKey: { type: String, default: null },
    holdId: { type: String, default: null },
    holdIds: { type: [String], default: [] }, // every hold it had (a late payment holds again)
    stay: {
      type: new b2bMongoose.Schema(
        {
          roomTypeId: { type: String, required: true },
          ratePlanId: { type: String, required: true },
          checkIn: { type: String, required: true },
          checkOut: { type: String, required: true },
          nights: { type: [String], required: true },
          occupancies: { type: [{ _id: false, adults: Number, children: Number }], required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    rooms: {
      type: [{ _id: false, leadGuest: { type: String, required: true }, guests: { type: [String], default: [] } }],
      required: true,
    },
    contact: { type: { name: String, email: String, phone: String }, required: true, _id: false },
    specialRequests: { type: String, default: null, maxlength: 500 },
    snapshot: {
      type: new b2bMongoose.Schema(
        { property: Mixed, roomTypeName: String, ratePlanName: String, mealPlanKey: String, policy: Mixed },
        { _id: false },
      ),
      required: true,
    },
    price: { type: Mixed, required: true }, // the full breakdown (internal)
    totalPaise: { type: Number, required: true, min: 0 },
    gstPaise: { type: Number, required: true, min: 0 },
    confirmedAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: String, default: null },
    escalationLevel: { type: Number, default: 0 }, // reminders sent while not acknowledged (1: 15 min, 2: 30 min, 3: 60 min)
    failure: { type: { code: String, detail: Mixed }, default: null, _id: false },
    ...stateFields(b2bMongoose, BOOKING_STATUSES),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const BookingRecord = defineTenantModel('HotelBooking', schema, BOOKINGS_COLLECTION, [
  'hotelOrgId',
  'clientOrgId',
  'customerId',
  'guestKey',
]);
