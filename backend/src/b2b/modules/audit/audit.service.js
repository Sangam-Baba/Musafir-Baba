// @ts-check
/**
 * Writing and reading the activity log. record() is the event consumer (one entry per event,
 * repeat-safe). Reads are newest first with a cursor (`before` = an entry id from the previous page).
 * Never the existing `AuditLog` model or its global plugin.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ForbiddenError } from '../../core/errors.js';
import { AuditEventRecord } from './models/audit-event.model.js';

const ACTOR_FIELDS = ['changedBy', 'removedBy', 'invitedBy', 'addedBy', 'createdBy'];
const PLATFORM_READ = systemScope('audit: MusafirBaba admin reads the activity log');

/** @typedef {{ before?: string | undefined, limit?: number | undefined, action?: string | undefined }} Page */

/** @param {any} e */
const entryDto = (e) => ({
  id: e._id,
  action: e.action,
  orgId: e.orgId,
  userId: e.userId,
  actorId: e.actorId,
  data: e.data,
  occurredAt: e.occurredAt,
});

/**
 * @param {Record<string, unknown>} filter
 * @param {Page} page
 */
async function readPage(filter, page, options = {}) {
  const limit = Math.min(Math.max(page.limit ?? 50, 1), 100);
  /** @type {Record<string, unknown>} */
  const query = { ...filter };
  if (page.action) query.action = page.action;
  if (page.before) {
    const cursor = await AuditEventRecord.findOne({ _id: page.before, ...filter }, { occurredAt: 1 })
      .setOptions(options)
      .lean();
    if (cursor) query.$or = [{ occurredAt: { $lt: cursor.occurredAt } }, { occurredAt: cursor.occurredAt, _id: { $lt: cursor._id } }];
  }
  const docs = await AuditEventRecord.find(query).sort({ occurredAt: -1, _id: -1 }).limit(limit).setOptions(options).lean();
  return { data: docs.map(entryDto), next: docs.length === limit ? (docs[docs.length - 1]?._id ?? null) : null };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createAuditService(deps) {
  return {
    /**
     * Event consumer: one log entry per event (the event id is the entry id → repeats are ignored).
     * @param {{ eventId: string, type: string, occurredAt: Date, payload: Record<string, unknown> }} event
     */
    async record(event) {
      const p = event.payload;
      const str = (/** @type {unknown} */ v) => (typeof v === 'string' ? v : null);
      const orgId = str(p.orgId);
      const userId = str(p.userId);
      if (!orgId && !userId) return; // nothing to attach it to — not an activity-log event
      const actorId = str(ACTOR_FIELDS.map((f) => p[f]).find((v) => typeof v === 'string')) ?? userId;
      try {
        await AuditEventRecord.create({
          _id: event.eventId,
          action: event.type,
          orgId,
          userId,
          actorId,
          data: p,
          occurredAt: event.occurredAt,
          recordedAt: deps.clock.now(),
        });
      } catch (error) {
        if (/** @type {{ code?: number }} */ (error).code !== 11000) throw error;
      }
    },

    /** The selected org's log. @param {import('../../core/context.js').RequestContext} ctx @param {Page} page */
    async listForOrg(ctx, page) {
      if (ctx.actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
      return readPage({ orgId: ctx.actor.orgId }, page);
    },

    /**
     * MusafirBaba admins: any org or user (or everything).
     * @param {import('../../core/context.js').RequestContext} ctx @param {Page & { orgId?: string | undefined, userId?: string | undefined }} page
     */
    async listAll(ctx, page) {
      if (ctx.actor.type !== 'staff') throw new ForbiddenError();
      /** @type {Record<string, unknown>} */
      const filter = {};
      if (page.orgId) filter.orgId = page.orgId;
      if (page.userId) filter.userId = page.userId;
      return readPage(filter, page, PLATFORM_READ);
    },
  };
}
