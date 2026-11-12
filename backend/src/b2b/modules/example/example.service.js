// @ts-check
/** Use cases: load → authorise → domain → save → events. */
import { normaliseItemName } from './domain/item.js';

/** @param {{ repository: ReturnType<typeof import('./repository.js').createExampleRepository> }} deps */
export function createExampleService(deps) {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ name: string }} input */
    createItem: (ctx, input) => deps.repository.create(ctx, normaliseItemName(input.name)),
    /** @param {import('../../core/context.js').RequestContext} ctx */
    listItems: (ctx) => deps.repository.list(ctx),
  };
}
