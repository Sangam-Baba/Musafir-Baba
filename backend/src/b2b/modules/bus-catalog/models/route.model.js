// @ts-check
/**
 * Routes (`bus_routes`, plan Stage 18 B3): ordered stops with times (day offset for next-day arrival), each allowing
 * boarding and / or dropping, and the review state. The stops of an approved (or waiting) route never change — trips
 * and sold seats depend on their order — so a changed route is a copy.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ROUTES_COLLECTION = 'bus_routes';

const stop = new b2bMongoose.Schema(
  {
    stopId: { type: String, required: true },
    cityId: { type: String, required: true },
    dayOffset: { type: Number, required: true, min: 0, max: 3 },
    time: { type: String, required: true },
    boarding: { type: Boolean, required: true },
    dropping: { type: Boolean, required: true },
  },
  { _id: false },
);

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 120 },
    stops: { type: [stop], default: [] },
    fromCityId: { type: String, required: true },
    toCityId: { type: String, required: true },
    status: { type: String, default: 'DRAFT' },
    review: { type: { _id: false, by: String, at: Date, note: String }, default: null },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const RouteRecord = defineTenantModel('BusRoute', schema, ROUTES_COLLECTION, ['operatorOrgId']);
