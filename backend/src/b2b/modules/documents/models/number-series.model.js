// @ts-check
/**
 * Gap-free number series (`doc_number_series`): one document per series (e.g. `TAX_INVOICE:07:26-27`) with the last
 * number given and the recent reservations (number + what it was for). A number is reserved in the same update that
 * moves the counter, keyed by what it is for, so a retry after a crash gets the same number back — no gaps, no doubles.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const NUMBER_SERIES_COLLECTION = 'doc_number_series';
export const KEEP_RESERVATIONS = 1000;

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String, required: true },
    last: { type: Number, required: true, default: 0 },
    recent: { type: [{ _id: false, n: Number, key: String, at: Date }], default: [] },
  },
  { versionKey: false, timestamps: true },
);

export const NumberSeriesRecord = defineModel('NumberSeries', schema, NUMBER_SERIES_COLLECTION);
