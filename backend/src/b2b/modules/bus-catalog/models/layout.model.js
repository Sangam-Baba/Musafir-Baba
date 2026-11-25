// @ts-check
/**
 * Seat layouts (`bus_layouts`, plan Stage 18 B2): an operator's bus layouts (decks, grid, seats). A layout used by an
 * approved bus is locked (copy it to change it), so seats already on sale never move.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const LAYOUTS_COLLECTION = 'bus_layouts';

const seat = new b2bMongoose.Schema(
  { no: String, row: Number, col: Number, type: String, ladies: { type: Boolean, default: false }, span: { type: Number, default: 1 } },
  { _id: false },
);
const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 80 },
    decks: { type: [{ _id: false, deck: String, rows: Number, cols: Number, seats: [seat] }], required: true },
    seatCount: { type: Number, required: true },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const LayoutRecord = defineTenantModel('BusLayout', schema, LAYOUTS_COLLECTION, ['operatorOrgId']);
