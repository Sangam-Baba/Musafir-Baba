// @ts-check
/**
 * Trip problems (`bus_trip_problems`, plan Stage 18 B7): a bus company tells MusafirBaba a trip has a problem
 * (breakdown, big delay, cancelled by the company, other) → ops queue; ops resolve it with a note (and, when needed,
 * cancel bookings with a full refund through the two-person ops cancellation).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const TRIP_PROBLEMS_COLLECTION = 'bus_trip_problems';
export const TRIP_PROBLEM_KINDS = /** @type {const} */ (['BREAKDOWN', 'DELAY', 'CANCELLED_BY_OPERATOR', 'OTHER']);

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    tripId: { type: String, required: true },
    tripDate: { type: String, required: true },
    kind: { type: String, enum: TRIP_PROBLEM_KINDS, required: true },
    note: { type: String, required: true, maxlength: 1000 },
    delayMinutes: { type: Number, default: null },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
    reportedBy: { type: String, required: true },
    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, default: null, maxlength: 1000 },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const TripProblemRecord = defineTenantModel('BusTripProblem', schema, TRIP_PROBLEMS_COLLECTION, ['operatorOrgId']);
