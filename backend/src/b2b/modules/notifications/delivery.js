// @ts-check
/**
 * From an event to a notification (plan 11 §4, §6): 1. the stored inbox row (once per event and recipient —
 * the source of truth), 2. a live push with ids and the title only, 3. emails from the template (critical
 * categories always; others when the user's preference allows). Admin work queues get a `queue:changed` push.
 * Repeat-safe: a repeated event finds its row and adds nothing; emails are queued until the row says QUEUED.
 * A failed live push is only logged — the bell's catch-up (`GET /notifications?after=`) fills it in.
 */
import { publish as publishSignal } from '../../core/realtime/signals.js';
import { ADMIN_QUEUES, categoryKeyFor, categoryOf } from './domain/catalogue.js';
import { renderTemplate } from './domain/templates.js';
import { InboxRecord } from './models/inbox.model.js';
import { PreferenceRecord } from './models/preference.model.js';

/** @typedef {{ userId: string, email: string | null }} Contact */
/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, publicUrl: string,
 *   logger?: import('../../core/logger.js').Logger,
 *   orgName: (orgId: string) => Promise<string | null>,
 *   ownerContacts: (orgId: string) => Promise<Contact[]>,
 *   userContact: (userId: string) => Promise<Contact | null>,
 *   queueEmail?: ((message: { to: string, subject: string, text: string }) => Promise<unknown>) | null,
 *   publish?: (room: string, event: string, data: Record<string, unknown>) => Promise<void> }} DeliveryDeps
 */

/** @param {DeliveryDeps} deps @param {string} room @param {string} event @param {Record<string, unknown>} data */
async function push(deps, room, event, data) {
  try {
    await (deps.publish ?? ((r, e, d) => publishSignal(r, e, d, deps)))(room, event, data);
  } catch (error) {
    deps.logger?.warn({ err: error, room, event }, 'notifications: live push failed (catch-up will show it)');
  }
}

/** @param {Record<string, unknown>} row */
async function insertOnce(row) {
  try {
    return { row: /** @type {any} */ ((await InboxRecord.create(row)).toObject()), created: true };
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code !== 11000) throw error;
    const existing = await InboxRecord.findOne({ eventId: row.eventId, recipientId: row.recipientId }).lean();
    return { row: /** @type {any} */ (existing), created: false };
  }
}

/**
 * Who gets the email: the org's Owners or the user; non-critical categories honour "email off".
 * @param {DeliveryDeps} deps
 * @param {{ category: string, critical: boolean, emailTo: string, orgId: string | null, userId: string | null }} c
 */
async function emailRecipients(deps, c) {
  const contacts =
    c.emailTo === 'OWNERS' && c.orgId
      ? await deps.ownerContacts(c.orgId)
      : c.userId
        ? [await deps.userContact(c.userId)].filter((x) => x !== null)
        : [];
  const withEmail = /** @type {{ userId: string, email: string }[]} */ (contacts.filter((x) => x?.email));
  if (c.critical || withEmail.length === 0) return withEmail;
  const off = await PreferenceRecord.find({ userId: { $in: withEmail.map((x) => x.userId) }, category: c.category, email: false }).lean();
  const muted = new Set(off.map((p) => p.userId));
  return withEmail.filter((x) => !muted.has(x.userId));
}

/** @param {DeliveryDeps} deps @param {any} row @param {{ emailTo: string, userId: string | null, subject: string, text: string }} msg */
async function sendEmails(deps, row, msg) {
  if (row.emailState !== 'PENDING' || !deps.queueEmail) return;
  const recipients = await emailRecipients(deps, {
    category: row.category,
    critical: row.critical,
    emailTo: msg.emailTo,
    orgId: row.orgId,
    userId: msg.userId,
  });
  for (const r of recipients) await deps.queueEmail({ to: r.email, subject: msg.subject, text: msg.text });
  await InboxRecord.updateOne({ _id: row._id, recipientId: row.recipientId, emailState: 'PENDING' }, { $set: { emailState: 'QUEUED' } });
}

/** @param {unknown} v */
const stringOrNull = (v) => (typeof v === 'string' ? v : null);

/** The link with the event's ids filled in (e.g. /business/properties/{propertyId}). @param {string} link @param {Record<string, unknown>} payload */
const linkFor = (link, payload) => link.replace('{propertyId}', encodeURIComponent(stringOrNull(payload.propertyId) ?? ''));

/**
 * Template variables an event can give (each template uses only those in its schema; values are cleaned there).
 * @param {Record<string, unknown>} payload
 */
const varsFrom = (payload) => ({
  propertyName: stringOrNull(payload.name) ?? 'your listing',
  decision: payload.decision === 'APPROVED' ? 'approved' : 'not approved',
  reason: stringOrNull(payload.reason) ?? 'see your listing for details',
});

/**
 * Org notifications go to the org; personal ones to `payload.userId`.
 * @param {import('./domain/catalogue.js').Category} category
 * @param {Record<string, unknown>} payload
 */
function recipientOf(category, payload) {
  const orgId = stringOrNull(payload.orgId);
  const userId = category.audience === 'USER' ? stringOrNull(payload.userId) : null;
  return { orgId, userId, recipientId: category.audience === 'ORG' ? orgId : userId };
}

/**
 * @param {DeliveryDeps} deps
 * @returns {(event: import('../../core/db/events.js').DomainEvent) => Promise<void>}
 */
export function createDelivery(deps) {
  return async (event) => {
    const queue = ADMIN_QUEUES[event.type];
    if (queue) await push(deps, 'b2b:admin:general', 'queue:changed', { queue });
    const key = categoryKeyFor(event.type, event.payload); // hotels exactly as before; B2B clients get their own wording
    const category = key ? categoryOf(key) : null;
    if (!key || !category) return;

    const { orgId, userId, recipientId } = recipientOf(category, event.payload);
    if (!recipientId) return;
    const orgName = (orgId ? await deps.orgName(orgId) : null) ?? 'your organisation';
    const path = linkFor(category.link, event.payload);
    const msg = renderTemplate(key, { ...varsFrom(event.payload), orgName, link: `${deps.publicUrl.replace(/\/$/, '')}${path}` });
    const { row, created } = await insertOnce({
      eventId: event.eventId,
      recipientType: category.audience,
      recipientId,
      orgId,
      category: key,
      title: msg.title,
      body: msg.body,
      link: path,
      entityType: event.type.split('.').slice(0, 2).join('.'),
      entityId: stringOrNull(event.payload.applicationId) ?? stringOrNull(event.payload.propertyId),
      propertyId: stringOrNull(event.payload.propertyId),
      critical: category.critical,
      templateVersion: msg.version,
      emailState: category.emailTo === 'NONE' || !deps.queueEmail ? 'NONE' : 'PENDING',
    });
    if (created) {
      const room = category.audience === 'ORG' ? `b2b:org:${recipientId}` : `b2b:user:${recipientId}`;
      await push(deps, room, 'notification:new', { id: String(row._id), category: key, title: msg.title });
    }
    await sendEmails(deps, row, { emailTo: category.emailTo, userId, subject: msg.subject, text: msg.text });
  };
}
