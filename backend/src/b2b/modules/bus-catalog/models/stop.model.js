// @ts-check
/**
 * Boarding / dropping points (`bus_stops`, plan Stage 18 B3): an operator's own points in a city from the shared city
 * list (e.g. "Kashmere Gate, Delhi"). Routes are built from these; searches match on the city.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const STOPS_COLLECTION = 'bus_stops';

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    cityId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 80 },
    address: { type: String, default: null, maxlength: 200 },
    landmark: { type: String, default: null, maxlength: 80 },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    active: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const StopRecord = defineTenantModel('BusStop', schema, STOPS_COLLECTION, ['operatorOrgId']);
