// @ts-check
/**
 * Schedules (`bus_schedules`, plan Stage 18 B3): which bus runs an approved route on which weekdays, from which day
 * until which day. Trips are made from active schedules 90 days ahead. A schedule is not edited: it is ended (unsold
 * future trips are cancelled) and a new one is made.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const SCHEDULES_COLLECTION = 'bus_schedules';

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    routeId: { type: String, required: true },
    vehicleId: { type: String, required: true },
    weekdays: { type: [Number], required: true },
    validFrom: { type: String, required: true },
    validTo: { type: String, default: null },
    status: { type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE' },
    endedFrom: { type: String, default: null },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const ScheduleRecord = defineTenantModel('BusSchedule', schema, SCHEDULES_COLLECTION, ['operatorOrgId']);
