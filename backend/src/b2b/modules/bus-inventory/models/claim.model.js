// @ts-check
/**
 * Seat claims (`bus_seat_claims`, plan Stage 18 §5, B4): one document per request that takes seats on a trip — a
 * buyer's **hold** (15 minutes while paying, then confirmed by the booking) or an operator's counter **block**. It is
 * the state document of a multi-step flow (P3): its id is written on every seat it takes, and its status says what to
 * finish after a crash —
 *   TAKING → ACTIVE (all seats taken) | FAILED (gave back what it took)
 *   ACTIVE → CONFIRMED (hold paid; seat entries become BOOKING) · ACTIVE / CONFIRMED → RELEASING → RELEASED.
 * The sweeper moves expired holds and claims stuck in TAKING / RELEASING forward (guarded by status and claim id).
 * (The plan named `bus_holds` and `bus_blocks`; one collection with a `kind` shares the same steps.)
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const CLAIMS_COLLECTION = 'bus_seat_claims';
export const CLAIM_STATUSES = /** @type {const} */ (['TAKING', 'ACTIVE', 'CONFIRMED', 'RELEASING', 'RELEASED', 'FAILED']);

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    tripId: { type: String, required: true },
    kind: { type: String, enum: ['HOLD', 'BLOCK'], required: true },
    seats: { type: [String], required: true },
    fromIdx: { type: Number, required: true },
    toIdx: { type: Number, required: true },
    mask: { type: Number, required: true },
    status: { type: String, enum: CLAIM_STATUSES, default: 'TAKING' },
    seatsConfirmed: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    by: { type: String, required: true },
    note: { type: String, default: null, maxlength: 200 },
    failure: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const ClaimRecord = defineTenantModel('BusSeatClaim', schema, CLAIMS_COLLECTION, ['operatorOrgId']);
