// @ts-check
/**
 * Booking requests (`hbk_booking_requests`, D37) — owned by the client company (tenant `clientOrgId`). What was asked
 * (hotel, room, plan, dates, guests, customer), the price the client was quoted (its own view: B2B price, GST, total —
 * never the hotel rate or the margin) and its own selling price if any, the status and its history.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { REQUEST_STATUSES } from '../domain/request.js';

export const BOOKING_REQUESTS_COLLECTION = 'hbk_booking_requests';

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    ref: { type: String, required: true },
    tokenHash: { type: String, required: true }, // the price token it came from (sending the same twice returns the first)
    createdBy: { type: String, required: true }, // user:<id>
    status: { type: String, enum: REQUEST_STATUSES, required: true },
    stay: {
      type: new b2bMongoose.Schema(
        {
          propertyId: { type: String, required: true },
          propertyRef: { type: String, required: true },
          propertyName: { type: String, required: true },
          city: { type: String, default: null },
          roomTypeId: { type: String, required: true },
          roomTypeName: { type: String, required: true },
          ratePlanId: { type: String, required: true },
          planName: { type: String, required: true },
          mealPlanKey: { type: String, default: null },
          checkIn: { type: String, required: true },
          checkOut: { type: String, required: true },
          occupancies: { type: [{ _id: false, adults: Number, children: Number }], required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    quoted: { type: b2bMongoose.Schema.Types.Mixed, required: true }, // the client's price view at the time
    sellingPricePaise: { type: Number, default: null },
    customer: {
      type: new b2bMongoose.Schema(
        {
          name: { type: String, required: true, maxlength: 120 },
          phone: { type: String, default: null, maxlength: 20 },
          email: { type: String, default: null, maxlength: 254 },
          reference: { type: String, default: null, maxlength: 60 },
          guestNames: { type: [String], default: [] },
        },
        { _id: false },
      ),
      required: true,
    },
    notes: { type: String, default: null, maxlength: 1000 },
    handledBy: { type: String, default: null }, // staff:<id>
    hotelConfirmation: { type: String, default: null, maxlength: 60 },
    decisionNote: { type: String, default: null, maxlength: 500 },
    version: { type: Number, default: 1 },
    history: {
      type: [{ _id: false, at: Date, action: String, by: String, status: String, note: { type: String, default: null } }],
      default: [],
    },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const BookingRequestRecord = defineTenantModel('HotelBookingRequest', schema, BOOKING_REQUESTS_COLLECTION, ['clientOrgId']);
