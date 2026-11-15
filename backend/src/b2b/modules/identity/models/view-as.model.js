// @ts-check
/**
 * `id_view_as`: a MusafirBaba admin viewing a client or hotel workspace as it sees it
 * (plan Stage 01 §3.7). Reason required, 30 minutes, READ unless WRITE was allowed with a fresh app code.
 * Start and end are recorded as events in the same writes (→ activity log). Owned by the org viewed.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const VIEW_AS_COLLECTION = 'id_view_as';
export const VIEW_AS_TTL_MS = 30 * 60_000;

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    staffId: { type: String, required: true },
    legacySessionId: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    mode: { type: String, enum: ['READ', 'WRITE'], required: true },
    expiresAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const ViewAsRecord = defineTenantModel('ViewAsSession', schema, VIEW_AS_COLLECTION, ['orgId']);
