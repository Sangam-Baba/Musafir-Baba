// @ts-check
/**
 * `aud_events`: the activity log (plan Stage 01 §3.8). One entry per domain event, `_id` = the event id,
 * so recording the same event twice is impossible. Append-only: nothing updates or deletes entries.
 * Owned by the org the event is about and/or the user it is about (either scopes a query).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const AUDIT_COLLECTION = 'aud_events';

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String },
    action: { type: String, required: true },
    orgId: { type: String, default: null },
    userId: { type: String, default: null },
    actorId: { type: String, default: null },
    data: { type: b2bMongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true },
    recordedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export const AuditEventRecord = defineTenantModel('AuditEvent', schema, AUDIT_COLLECTION, ['orgId', 'userId']);
