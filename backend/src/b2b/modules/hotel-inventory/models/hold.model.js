// @ts-check
/**
 * `inv_holds`: the state document of a checkout's rooms (`05-…` §5.0). Statuses:
 * PLACING → ACTIVE → CONFIRMING → CONFIRMED, or PLACING / ACTIVE → RELEASING → RELEASED, or PLACING → FAILED
 * (also CONFIRMING → FAILED when a night was truly lost and its booked nights were given back).
 * Every status change is a conditional update on the expected status; `statusAt` lets the reconciler find
 * steps that stopped half way. One hold per order (unique `orderId`). Expiry is handled by the sweeper — never
 * a TTL index. Carries events (relayed to the outbox).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const HOLDS_COLLECTION = 'inv_holds';
export const HOLD_STATUSES = /** @type {const} */ (['PLACING', 'ACTIVE', 'CONFIRMING', 'CONFIRMED', 'RELEASING', 'RELEASED', 'FAILED']);

const schema = new b2bMongoose.Schema(
  {
    orderId: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    lines: {
      type: [
        {
          _id: false,
          roomTypeId: { type: String, required: true },
          qty: { type: Number, required: true, min: 1 },
          dates: { type: [String], required: true },
        },
      ],
      required: true,
    },
    status: { type: String, enum: HOLD_STATUSES, required: true },
    statusAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    extendedOnce: { type: Boolean, default: false },
    bookingId: { type: String, default: null },
    failure: { type: b2bMongoose.Schema.Types.Mixed, default: null },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const HoldRecord = defineTenantModel('InvHold', schema, HOLDS_COLLECTION, ['hotelOrgId']);
