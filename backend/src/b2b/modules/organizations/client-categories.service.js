// @ts-check
/**
 * Client categories (S10-T04): the list (admin-managed, seeded Standard / Silver / Gold) and a client's category.
 * Changing a client's category is one update on its organisation that also stores
 * `organizations.org.category-changed` (relayed); search picks the new category up within a minute (cached org info).
 */
import { newEvent } from '../../core/db/events.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { ClientCategoryRecord } from './models/client-category.model.js';
import { OrganizationRecord } from './models/organization.model.js';

export const SEED_CLIENT_CATEGORIES = Object.freeze([
  { key: 'STANDARD', name: 'Standard', description: 'Every verified client starts here', order: 10 },
  { key: 'SILVER', name: 'Silver', description: null, order: 20 },
  { key: 'GOLD', name: 'Gold', description: null, order: 30 },
]);
export const DEFAULT_CLIENT_CATEGORY = 'STANDARD';
const KEY = /^[A-Z][A-Z0-9_]{1,39}$/;

/** Adds the starter categories whose key is missing (never changes existing ones). */
export async function seedClientCategories() {
  const res = await ClientCategoryRecord.bulkWrite(
    SEED_CLIENT_CATEGORIES.map((c) => ({ updateOne: { filter: { key: c.key }, update: { $setOnInsert: c }, upsert: true } })),
    { ordered: false },
  );
  return res.upsertedCount;
}

/** @param {Record<string, any>} c */
const dto = (c) => ({ key: c.key, name: c.name, description: c.description ?? null, order: c.order, active: c.active });

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createClientCategoriesService(deps) {
  return {
    /** @param {{ includeInactive?: boolean }} [opts] */
    async list(opts = {}) {
      const docs = await ClientCategoryRecord.find(opts.includeInactive ? {} : { active: true })
        .sort({ order: 1, name: 1 })
        .lean();
      return docs.map(dto);
    },

    /** @param {string} by @param {{ key: string, name: string, description?: string | null, order?: number }} input */
    async create(by, input) {
      const key = input.key.trim().toUpperCase();
      if (!KEY.test(key)) throw new DomainError('CATEGORY_KEY_INVALID');
      try {
        const doc = await ClientCategoryRecord.create({
          key,
          name: input.name.trim(),
          description: input.description ?? null,
          order: input.order ?? 100,
          updatedBy: by,
        });
        return dto(doc.toObject());
      } catch (error) {
        if (/** @type {any} */ (error)?.code === 11000) throw new ConflictError('CATEGORY_EXISTS');
        throw error;
      }
    },

    /** Rename, reorder or switch on / off (the key never changes). @param {string} by @param {string} key @param {{ name?: string, description?: string | null, order?: number, active?: boolean }} change */
    async update(by, key, change) {
      const doc = await ClientCategoryRecord.findOneAndUpdate({ key }, { $set: { ...change, updatedBy: by } }, { new: true }).lean();
      if (!doc) throw new NotFoundError('CATEGORY_NOT_FOUND');
      return dto(doc);
    },

    /**
     * Set a client's category (an active one; clients only). Repeat-safe: the same category again changes nothing.
     * @param {string} by
     * @param {string} orgId
     * @param {string} key
     */
    async assign(by, orgId, key) {
      const org = /^[a-f0-9]{24}$/.test(orgId)
        ? await OrganizationRecord.findOne({ _id: orgId }, { type: 1, clientCategory: 1 }).lean()
        : null;
      if (!org || org.type !== 'CLIENT') throw new NotFoundError('CLIENT_NOT_FOUND');
      if (!(await ClientCategoryRecord.exists({ key, active: true }))) throw new DomainError('CATEGORY_NOT_ACTIVE');
      if (org.clientCategory === key) return { orgId, clientCategory: key, changed: false };
      const event = newEvent(EVENTS.orgCategoryChanged, { orgId, clientCategory: key, previous: org.clientCategory ?? null, by }, deps);
      await OrganizationRecord.updateOne(
        { _id: orgId },
        { $set: { clientCategory: key, hasPendingEvents: true }, $push: { pendingEvents: event } },
      );
      return { orgId, clientCategory: key, changed: true };
    },
  };
}
