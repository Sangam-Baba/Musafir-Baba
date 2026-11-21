// @ts-check
/**
 * Hotel payables (`wal_payables`, plan Stage 09 §3.9) — one per booking: what MusafirBaba owes the hotel for it now and
 * whether it can be paid. PENDING (stay not over / no-show open) → ELIGIBLE (stay over, cancellation or no-show final)
 * → PAID (a recorded payout, S09-T11 — locked: never changed or paid twice); VOID when nothing is owed.
 * Kept in step with the booking (the ledger's hotel payable account holds the same amounts). Owned by the hotel company.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const PAYABLES_COLLECTION = 'wal_payables';
export const PAYABLE_STATUSES = /** @type {const} */ (['PENDING', 'ELIGIBLE', 'PAID', 'VOID']);

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    orderRef: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    checkOut: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYABLE_STATUSES, required: true },
    eligibleAt: { type: Date, default: null },
    payoutId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    history: { type: [{ _id: false, at: Date, status: String, amountPaise: Number }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const PayableRecord = defineTenantModel('HotelPayable', schema, PAYABLES_COLLECTION, ['hotelOrgId']);
