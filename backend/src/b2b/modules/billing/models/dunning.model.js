// @ts-check
/**
 * Dunning steps (`bil_dunning_attempts`, plan Stage 13 §3.9): one row per client, past-due episode and step —
 * reminders on day 0, 3 and 7, suspension on day 10 — so each step happens once; the reminder / suspension event is
 * pushed in the same insert (relay → bell + owners' email). Owned by the client.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const DUNNING_COLLECTION = 'bil_dunning_attempts';

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    episode: { type: String, required: true }, // the past-due start (ISO) — a new episode starts the steps again
    step: { type: Number, required: true }, // days past due: 0, 3, 7, 10
    action: { type: String, enum: ['REMIND', 'SUSPEND'], required: true },
    unpaidPaise: { type: Number, required: true },
    at: { type: Date, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const DunningRecord = defineTenantModel('DunningAttempt', schema, DUNNING_COLLECTION, ['clientOrgId']);
