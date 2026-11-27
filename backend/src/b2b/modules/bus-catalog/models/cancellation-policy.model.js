// @ts-check
/**
 * Cancellation policies (`bus_cancellation_policies`, plan Stage 18 B7): one per bus company — its slabs and a change
 * log. A booking keeps a copy of the slabs it was sold with; later changes never touch sold tickets.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const CANCELLATION_POLICIES_COLLECTION = 'bus_cancellation_policies';

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    slabs: { type: [{ _id: false, hoursBefore: Number, percent: Number }], default: [] },
    version: { type: Number, default: 1 },
    history: { type: [{ _id: false, at: Date, by: String, slabs: [{ _id: false, hoursBefore: Number, percent: Number }] }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const CancellationPolicyRecord = defineTenantModel('BusCancellationPolicy', schema, CANCELLATION_POLICIES_COLLECTION, [
  'operatorOrgId',
]);
