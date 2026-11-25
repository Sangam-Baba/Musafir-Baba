// @ts-check
/**
 * Fares (`bus_fares`, plan Stage 18 B4): one document per route — net fare rows (stop pair × seat type × deck, integer
 * paise), date rules (weekend / festival amounts), and a change log of the last 100 saves (who, when, what changed).
 * Saved whole with a version check, so two people editing at once never silently overwrite each other.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const FARES_COLLECTION = 'bus_fares';

const row = new b2bMongoose.Schema(
  {
    fromIdx: { type: Number, required: true },
    toIdx: { type: Number, required: true },
    seatType: { type: String, required: true },
    deck: { type: String, default: null },
    netPaise: { type: Number, required: true },
  },
  { _id: false },
);
const rule = new b2bMongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, maxlength: 60 },
    from: { type: String, required: true },
    to: { type: String, required: true },
    weekdays: { type: [Number], default: [] },
    addPaise: { type: Number, required: true },
  },
  { _id: false },
);

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    routeId: { type: String, required: true },
    rows: { type: [row], default: [] },
    rules: { type: [rule], default: [] },
    version: { type: Number, default: 1 },
    history: { type: [{ _id: false, at: Date, by: String, summary: String }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const FareRecord = defineTenantModel('BusFare', schema, FARES_COLLECTION, ['operatorOrgId']);
