// @ts-check
/**
 * `ntf_inbox`: stored notifications — the source of truth for the bell (plan 11 §6, §10).
 * One row per event and recipient (unique `{eventId, recipientId}`, so a repeated event adds nothing).
 * Org notifications are stored once per org; "read" is per user (`readBy`). `emailState` makes the email
 * step repeat-safe: PENDING until the emails are queued. Owned by the recipient (a user or an org).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const INBOX_COLLECTION = 'ntf_inbox';

const schema = new b2bMongoose.Schema(
  {
    eventId: { type: String, required: true },
    recipientType: { type: String, enum: ['USER', 'ORG'], required: true },
    recipientId: { type: String, required: true },
    orgId: { type: String, default: null },
    category: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: null },
    link: { type: String, default: null },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    critical: { type: Boolean, default: false },
    templateVersion: { type: Number, default: 1 },
    readBy: { type: [{ _id: false, userId: { type: String, required: true }, at: { type: Date, required: true } }], default: [] },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: String, default: null },
    emailState: { type: String, enum: ['NONE', 'PENDING', 'QUEUED'], default: 'NONE' },
  },
  { timestamps: true, versionKey: false },
);

export const InboxRecord = defineTenantModel('NotificationInbox', schema, INBOX_COLLECTION, ['recipientId']);
