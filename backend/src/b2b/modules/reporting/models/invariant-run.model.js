// @ts-check
/**
 * Safety-check runs (`rpt_invariant_runs`, plan Stage 16 §2.4): one row per run of the scheduled checks (rooms booked +
 * held ≤ total, ledger balanced, nothing stuck…) — so admins see the last result and how long the system has been
 * clean (go-live needs 7 days without a problem). Kept 90 days.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const INVARIANT_RUNS_COLLECTION = 'rpt_invariant_runs';

const schema = new b2bMongoose.Schema(
  {
    at: { type: Date, required: true },
    ok: { type: Boolean, required: true },
    checks: {
      type: [{ _id: false, name: String, violations: Number, sample: [String], error: { type: String, default: null } }],
      default: [],
    },
    alerts: { type: [String], default: [] }, // checks an alert email was sent for in this run
  },
  { versionKey: false, strict: 'throw' },
);

export const InvariantRunRecord = defineModel('InvariantRun', schema, INVARIANT_RUNS_COLLECTION);
