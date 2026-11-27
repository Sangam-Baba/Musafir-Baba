// @ts-check
/**
 * Bus company payables (`bus_payables`, plan Stage 18 B7, separate from hotel payables by the owner's decision): one per
 * confirmed bus booking — what is owed now and whether it can be paid. PENDING → ELIGIBLE (trip ended / fully cancelled)
 * → PAID (locked to a bus payout run, never changed or paid twice); VOID when nothing is owed.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const BUS_PAYABLES_COLLECTION = 'bus_payables';

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    orderRef: { type: String, required: true },
    operatorOrgId: { type: String, required: true },
    tripDate: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['PENDING', 'ELIGIBLE', 'PAID', 'VOID'], required: true },
    eligibleAt: { type: Date, default: null },
    runId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    history: { type: [{ _id: false, at: Date, status: String, amountPaise: Number }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const BusPayableRecord = defineTenantModel('BusPayable', schema, BUS_PAYABLES_COLLECTION, ['operatorOrgId']);
