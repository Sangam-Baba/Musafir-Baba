// @ts-check
/**
 * Trips (`bus_trips`, plan Stage 18 B3): one run of a schedule on a departure date (Indian time) — the route's stops
 * with their moments, the bus, a copy of its layout grid (later layout edits never move sold seats) and the status.
 * One trip per schedule and date (unique), so the trip job can run any number of times. `seatsReady` turns true once every seat document exists (the job finishes a trip
 * left half-made by a crash).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const TRIPS_COLLECTION = 'bus_trips';

const stop = new b2bMongoose.Schema(
  {
    stopId: { type: String, required: true },
    cityId: { type: String, required: true },
    name: { type: String, default: '' },
    at: { type: Date, required: true },
    boarding: { type: Boolean, required: true },
    dropping: { type: Boolean, required: true },
  },
  { _id: false },
);

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    scheduleId: { type: String, required: true },
    routeId: { type: String, required: true },
    vehicleId: { type: String, required: true },
    layoutId: { type: String, required: true },
    date: { type: String, required: true },
    stops: { type: [stop], required: true },
    fromCityId: { type: String, required: true },
    toCityId: { type: String, required: true },
    departAt: { type: Date, required: true },
    arriveAt: { type: Date, required: true },
    legs: { type: Number, required: true },
    decks: { type: [{ _id: false, deck: String, rows: Number, cols: Number }], required: true }, // grid of the layout it was made with
    seatCount: { type: Number, required: true },
    seatsReady: { type: Boolean, default: false },
    status: { type: String, enum: ['SCHEDULED', 'CANCELLED'], default: 'SCHEDULED' },
    saleStopped: { type: Boolean, default: false }, // operator stopped online sale (counter blocks still work)
    cancelReason: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const TripRecord = defineTenantModel('BusTrip', schema, TRIPS_COLLECTION, ['operatorOrgId']);
