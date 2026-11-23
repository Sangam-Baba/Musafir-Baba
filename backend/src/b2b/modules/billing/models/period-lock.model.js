// @ts-check
/**
 * Period locks (`bil_period_locks`, plan Stage 15 §3.5): a month locked after the GST return is filed — no document
 * may be dated in it again; corrections go in the current month. Keeps the register totals at the moment of locking.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const PERIOD_LOCKS_COLLECTION = 'bil_period_locks';

const schema = new b2bMongoose.Schema(
  {
    month: { type: String, required: true }, // YYYY-MM (India)
    lockedBy: { type: String, required: true },
    lockedAt: { type: Date, required: true },
    note: { type: String, default: null, maxlength: 500 },
    totals: { type: b2bMongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const PeriodLockRecord = defineModel('PeriodLock', schema, PERIOD_LOCKS_COLLECTION);
