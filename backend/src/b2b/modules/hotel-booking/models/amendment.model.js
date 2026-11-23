// @ts-check
/**
 * Change requests on a booking (`hbk_amendments`, plan Stage 09 §3.5): the buyer asks (new dates, guests, a better room,
 * a refund question, anything else) and MusafirBaba answers in the same thread. Guest-name corrections are applied to
 * the booking by staff (recorded in the booking's history); date or room changes are a cancel + rebook handled by
 * the team. Owned by the hotel company and the buyer. Messages are text only.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const AMENDMENTS_COLLECTION = 'hbk_amendments';
export const AMENDMENT_TYPES = /** @type {const} */ (['MODIFY_DATES', 'MODIFY_GUESTS', 'UPGRADE_ROOM', 'REFUND_REQUEST', 'OTHER']);
export const AMENDMENT_STATUSES = /** @type {const} */ (['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']);
export const FIRST_RESPONSE_HOURS = 4; // the team answers within 4 hours (SLA colours in admin)

const schema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    customerId: { type: String, default: null },
    guestKey: { type: String, default: null },
    clientOrgId: { type: String, default: null },
    type: { type: String, enum: AMENDMENT_TYPES, required: true },
    status: { type: String, enum: AMENDMENT_STATUSES, required: true },
    guestNames: { type: [{ _id: false, room: Number, leadGuest: String }], default: [] }, // MODIFY_GUESTS: what the buyer asks for
    guestNamesApplied: { type: Boolean, default: false },
    messages: { type: [{ _id: false, at: Date, from: { type: String, enum: ['BUYER', 'STAFF'] }, by: String, text: String }], default: [] },
    firstResponseDueAt: { type: Date, required: true },
    firstRespondedAt: { type: Date, default: null },
    handledBy: { type: String, default: null },
    resolution: { type: String, default: null, maxlength: 1000 },
    version: { type: Number, default: 1 },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const AmendmentRecord = defineTenantModel('HotelAmendment', schema, AMENDMENTS_COLLECTION, [
  'hotelOrgId',
  'customerId',
  'guestKey',
  'clientOrgId',
]);
