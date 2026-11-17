// @ts-check
/**
 * `inv_change_log`: every calendar change (plan Stage 04 §3.12) — who, when, which nights, what was asked, and the
 * values before it (so the last change can be undone). Append-only (only `status` / `undoneAt` change); `month`
 * groups entries for archiving. `requestId` makes a repeated request return the first result.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const CHANGE_LOG_COLLECTION = 'inv_change_log';

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    requestId: { type: String, required: true },
    kind: { type: String, enum: ['EDIT', 'UNDO', 'OVERRIDE', 'IMPORT'], required: true },
    status: { type: String, enum: ['APPLYING', 'APPLIED'], required: true },
    by: { type: String, required: true },
    reason: { type: String, default: null },
    month: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    weekdays: { type: [Number], default: null },
    request: { type: b2bMongoose.Schema.Types.Mixed, required: true },
    before: { type: b2bMongoose.Schema.Types.Mixed, required: true },
    result: { type: b2bMongoose.Schema.Types.Mixed, default: null },
    undoOf: { type: String, default: null },
    undoneAt: { type: Date, default: null },
    ...eventFields(b2bMongoose), // inventory.changed for the nights the change touched
  },
  { timestamps: true, versionKey: false },
);

export const ChangeLogRecord = defineTenantModel('InvChangeLog', schema, CHANGE_LOG_COLLECTION, ['hotelOrgId']);
