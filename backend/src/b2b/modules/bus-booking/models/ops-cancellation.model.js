// @ts-check
/**
 * Ops cancellations (`bus_ops_cancellations`, plan Stage 18 B7): MusafirBaba cancelling one bus booking or a whole trip
 * with a full refund (the bus broke down, the operator cancelled…). One person proposes with a reason, a different
 * person approves; it runs once and records what happened to each booking.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const OPS_CANCELLATIONS_COLLECTION = 'bus_ops_cancellations';

const schema = new b2bMongoose.Schema(
  {
    scope: { type: String, enum: ['BOOKING', 'TRIP'], required: true },
    bookingRef: { type: String, default: null },
    tripId: { type: String, default: null },
    operatorOrgId: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ['PROPOSED', 'DONE', 'REJECTED'], required: true },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    results: { type: [{ _id: false, bookingRef: String, refundPaise: Number, error: String }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const OpsCancellationRecord = defineModel('BusOpsCancellation', schema, OPS_CANCELLATIONS_COLLECTION);
