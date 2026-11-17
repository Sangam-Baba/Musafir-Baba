// @ts-check
/**
 * State transitions as ONE conditional single-document update (patterns P1 + P3 + P5,
 * docs/plan/01-architecture.md §8). Only the caller whose update matches the expected
 * status wins — two processes can never both move a document. The same update records
 * when the status changed (for the reconciler) and pushes any events.
 * No transactions: correct on the standalone production MongoDB.
 */
import { eventFields } from './events.js';

/**
 * Schema fields for a state document. Spread into a schema definition.
 * @param {typeof import('mongoose')} m
 * @param {readonly string[]} statuses
 */
export function stateFields(m, statuses) {
  return {
    status: { type: String, required: true, enum: statuses },
    statusChangedAt: { type: Date, required: true },
    reconcileAttempts: { type: Number, default: undefined },
    ...eventFields(m),
  };
}

/**
 * @typedef {object} TransitionInput
 * @property {unknown} id
 * @property {string | readonly string[]} from   expected current status(es)
 * @property {string} to
 * @property {Record<string, unknown>} [scope]   ownership filter, e.g. { orgId } (tenant guard)
 * @property {Record<string, unknown>} [set]     other fields to set in the same update
 * @property {readonly import('./events.js').DomainEvent[]} [events]
 * @property {import('../clock.js').Clock} clock
 * @property {import('./tenant-plugin.js').TenantOptions} [options]  only systemScope(reason) — no sessions/transactions
 */

/**
 * @param {import('mongoose').Model<any>} model
 * @param {TransitionInput} input
 * @returns {Promise<boolean>} true if this caller made the change
 */
export async function transition(model, input) {
  const from = typeof input.from === 'string' ? input.from : { $in: [...input.from] };
  const events = input.events ?? [];
  /** @type {Record<string, unknown>} */
  const update = {
    $set: {
      ...(input.set ?? {}),
      status: input.to,
      statusChangedAt: input.clock.now(),
      ...(events.length > 0 ? { hasPendingEvents: true } : {}),
    },
    $unset: { reconcileAttempts: '' },
  };
  if (events.length > 0) update.$push = { pendingEvents: { $each: [...events] } };
  const options = /** @type {import('mongoose').MongooseUpdateQueryOptions} */ ({ ...(input.options ?? {}) });
  const result = await model.updateOne({ ...(input.scope ?? {}), _id: input.id, status: from }, update, options);
  return result.modifiedCount === 1;
}
