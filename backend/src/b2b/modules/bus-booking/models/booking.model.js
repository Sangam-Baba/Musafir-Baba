// @ts-check
/**
 * Bus bookings (`bus_bookings`, plan Stage 18 B6): one per order — the PNR (`MBB-…`), the trip and journey (boarding /
 * getting-off stop with their moments), seats with one passenger each, the buyer's contact, the seat hold (claim) it
 * holds, the price breakdown as sold (never re-priced), copies of what the ticket shows, and the status:
 *   HELD → CONFIRMED (paid) | EXPIRED (hold ran out; paid late → held again) | FAILED · CONFIRMED → CANCELLED (B7)
 * Owned by the bus company (`operatorOrgId`) and the buyer (client company / website customer / guest).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const BOOKINGS_COLLECTION = 'bus_bookings';
export const BOOKING_STATUSES = /** @type {const} */ (['HELD', 'CONFIRMED', 'EXPIRED', 'FAILED', 'CANCELLED', 'COMPLETED']);

const point = { _id: false, idx: Number, stopId: String, cityId: String, name: String, at: Date };

const schema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    channel: { type: String, required: true },
    operatorOrgId: { type: String, required: true },
    clientOrgId: { type: String, default: null },
    customerId: { type: String, default: null },
    guestKey: { type: String, default: null },
    tripId: { type: String, required: true },
    routeId: { type: String, required: true },
    vehicleId: { type: String, required: true },
    date: { type: String, required: true },
    from: { type: point, required: true },
    to: { type: point, required: true },
    seats: {
      type: [{ _id: false, no: String, seatType: String, deck: String, passenger: { name: String, age: Number, gender: String } }],
      required: true,
    },
    contact: { type: { _id: false, name: String, email: String, phone: String }, required: true },
    claimId: { type: String, default: null },
    claimIds: { type: [String], default: [] },
    price: { type: b2bMongoose.Schema.Types.Mixed, required: true },
    totalPaise: { type: Number, required: true },
    gstPaise: { type: Number, required: true },
    snapshot: { type: b2bMongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    statusChangedAt: { type: Date, required: true },
    confirmedAt: { type: Date, default: null },
    history: { type: [{ _id: false, at: Date, from: String, to: String, by: String, note: String }], default: [] },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const BusBookingRecord = defineTenantModel('BusBooking', schema, BOOKINGS_COLLECTION, [
  'operatorOrgId',
  'clientOrgId',
  'customerId',
  'guestKey',
]);
