// @ts-check
/** All database access for this module. The org always comes from ctx, never from input. */
import { ForbiddenError } from '../../core/errors.js';
import { ExampleItem } from './models/item.model.js';

/** @typedef {{ id: string, name: string }} ItemDto */

/** @param {import('../../core/context.js').RequestContext} ctx */
function orgIdOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError();
  return ctx.actor.orgId;
}

/** @param {{ _id: unknown, name: string }} doc @returns {ItemDto} */
const toDto = (doc) => ({ id: String(doc._id), name: doc.name });

/** Repository for items; every query is scoped to the caller's organisation. */
export function createExampleRepository() {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} name */
    async create(ctx, name) {
      const doc = await ExampleItem.create({ orgId: orgIdOf(ctx), name });
      return toDto(doc);
    },
    /** @param {import('../../core/context.js').RequestContext} ctx */
    async list(ctx) {
      const docs = await ExampleItem.find({ orgId: orgIdOf(ctx) })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      return docs.map(toDto);
    },
  };
}
