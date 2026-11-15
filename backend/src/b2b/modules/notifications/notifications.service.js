// @ts-check
/**
 * The bell and preferences (plan 11 §6, §10, §11). A member sees their own notifications and their org's
 * notifications in categories their permissions allow; a user who switched a non-critical category's
 * in-app messages off doesn't see it. "Read" is per user; the list is newest first, and `after` returns
 * only what is newer than the cursor (catch-up after a reconnect).
 */
import { DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { CATEGORIES, categoryOf, visibleOrgCategories } from './domain/catalogue.js';
import { InboxRecord } from './models/inbox.model.js';
import { PreferenceRecord } from './models/preference.model.js';

const ID = /^[a-f0-9]{24}$/;

/** @param {import('../../core/context.js').RequestContext} ctx */
function viewerOf(ctx) {
  const a = ctx.actor;
  if (a.type === 'member') return { userId: a.userId, orgId: a.orgId, permissions: a.permissions };
  if (a.type === 'user') return { userId: a.userId, orgId: null, permissions: /** @type {string[]} */ ([]) };
  throw new ForbiddenError('BUSINESS_LOGIN_REQUIRED');
}

/** @param {string} userId @returns {Promise<Set<string>>} non-critical categories with in-app switched off */
async function hiddenFor(userId) {
  const off = await PreferenceRecord.find({ userId, inApp: false }).lean();
  return new Set(off.map((p) => p.category).filter((c) => categoryOf(c)?.critical === false));
}

/** @param {ReturnType<typeof viewerOf>} v @param {Set<string>} hidden */
function visibleFilter(v, hidden) {
  const userCats = Object.entries(CATEGORIES)
    .filter(([key, c]) => c.audience === 'USER' && !hidden.has(key))
    .map(([key]) => key);
  /** @type {Record<string, unknown>[]} */
  const or = [{ recipientType: 'USER', recipientId: v.userId, category: { $in: userCats } }];
  if (v.orgId) {
    const orgCats = visibleOrgCategories(v.permissions).filter((c) => !hidden.has(c));
    or.push({ recipientType: 'ORG', recipientId: v.orgId, category: { $in: orgCats } });
  }
  return { $or: or };
}

/** @param {any} n @param {string} userId */
const toDto = (n, userId) => ({
  id: String(n._id),
  category: n.category,
  title: n.title,
  body: n.body,
  link: n.link,
  critical: n.critical,
  createdAt: n.createdAt,
  read: (n.readBy ?? []).some((/** @type {any} */ r) => r.userId === userId),
  acknowledgedAt: n.acknowledgedAt ?? null,
});

/** @param {import('../../core/context.js').RequestContext} ctx */
async function scope(ctx) {
  const v = viewerOf(ctx);
  return { v, filter: visibleFilter(v, await hiddenFor(v.userId)) };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createNotificationsService(deps) {
  return {
    /**
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ after?: string, before?: string, limit?: number, unread?: boolean }} q
     */
    async list(ctx, q) {
      const { v, filter } = await scope(ctx);
      /** @type {Record<string, unknown>} */
      const extra = {};
      if (q.after) extra._id = { $gt: q.after };
      else if (q.before) extra._id = { $lt: q.before };
      if (q.unread) extra['readBy.userId'] = { $ne: v.userId };
      const docs = await InboxRecord.find({ $and: [filter, extra] })
        .sort({ _id: -1 })
        .limit(Math.min(q.limit ?? 50, 100))
        .lean();
      const data = docs.map((n) => toDto(n, v.userId));
      return { data, cursor: data[0]?.id ?? q.after ?? null };
    },

    /** @param {import('../../core/context.js').RequestContext} ctx */
    async unreadCount(ctx) {
      const { v, filter } = await scope(ctx);
      return { count: await InboxRecord.countDocuments({ $and: [filter, { 'readBy.userId': { $ne: v.userId } }] }) };
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    async markRead(ctx, id) {
      const { v, filter } = await scope(ctx);
      const found = ID.test(id) ? await InboxRecord.findOne({ $and: [filter, { _id: id }] }).lean() : null;
      if (!found) throw new NotFoundError('NOTIFICATION_NOT_FOUND');
      await InboxRecord.updateOne(
        { _id: id, recipientId: found.recipientId, 'readBy.userId': { $ne: v.userId } },
        { $push: { readBy: { userId: v.userId, at: deps.clock.now() } } },
      );
    },

    /** @param {import('../../core/context.js').RequestContext} ctx */
    async markAllRead(ctx) {
      const { v, filter } = await scope(ctx);
      const res = await InboxRecord.updateMany(
        { $and: [filter, { 'readBy.userId': { $ne: v.userId } }] },
        { $push: { readBy: { userId: v.userId, at: deps.clock.now() } } },
      );
      return { updated: res.modifiedCount };
    },

    ...preferenceFunctions(),
  };
}

function preferenceFunctions() {
  return {
    /** Every category this person can receive, with their choices; critical ones are locked on. @param {import('../../core/context.js').RequestContext} ctx */
    async preferences(ctx) {
      const v = viewerOf(ctx);
      const mine = new Map((await PreferenceRecord.find({ userId: v.userId }).lean()).map((p) => [p.category, p]));
      const orgCats = new Set(v.orgId ? visibleOrgCategories(v.permissions) : []);
      return {
        data: Object.entries(CATEGORIES)
          .filter(([key, c]) => c.audience === 'USER' || orgCats.has(key))
          .map(([key, c]) => ({
            category: key,
            label: c.label,
            critical: c.critical,
            locked: c.critical,
            inApp: c.critical || (mine.get(key)?.inApp ?? true),
            email: c.critical || (mine.get(key)?.email ?? true),
          })),
      };
    },

    /**
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ category: string, inApp: boolean, email: boolean }} input
     */
    async setPreference(ctx, input) {
      const v = viewerOf(ctx);
      const category = categoryOf(input.category);
      if (!category) throw new DomainError('CATEGORY_UNKNOWN');
      if (category.critical) throw new DomainError('CATEGORY_LOCKED'); // critical messages can't be switched off
      await PreferenceRecord.updateOne(
        { userId: v.userId, category: input.category },
        { $set: { inApp: input.inApp, email: input.email } },
        { upsert: true },
      );
    },
  };
}
