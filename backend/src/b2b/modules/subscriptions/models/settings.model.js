// @ts-check
/**
 * Subscription settings (`sub_settings`, plan Stage 13 §2): one document per setting — today `query-weights` (what
 * counts as a query, by kind; booking 0 by default so bookings are never blocked). Changed by MusafirBaba admin.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const SUB_SETTINGS_COLLECTION = 'sub_settings';

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String, required: true },
    weights: { type: b2bMongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const SubSettingsRecord = defineModel('SubSettings', schema, SUB_SETTINGS_COLLECTION);
