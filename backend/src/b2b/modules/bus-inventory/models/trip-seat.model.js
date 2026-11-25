// @ts-check
/**
 * Trip seats (`bus_trip_seats`, plan Stage 18 §5): one document per seat of a trip. `taken` is the bit mask of route
 * legs already held, sold or blocked on this seat; `entries` records who holds which legs (B4). Seats are taken only
 * by one conditional update (`taken: { $bitsAllClear: mask }` → `$bit: { taken: { or: mask } }`) in bus-inventory.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const TRIP_SEATS_COLLECTION = 'bus_trip_seats';

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    tripId: { type: String, required: true },
    no: { type: String, required: true },
    deck: { type: String, enum: ['LOWER', 'UPPER'], required: true },
    type: { type: String, enum: ['SEATER', 'SEMI_SLEEPER', 'SLEEPER'], required: true },
    ladies: { type: Boolean, default: false },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    span: { type: Number, default: 1 },
    taken: { type: Number, default: 0 },
    entries: {
      type: [{ _id: false, kind: { type: String, enum: ['HOLD', 'BOOKING', 'BLOCK'] }, ref: String, mask: Number, at: Date }],
      default: [],
    },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const TripSeatRecord = defineTenantModel('BusTripSeat', schema, TRIP_SEATS_COLLECTION, ['operatorOrgId']);
