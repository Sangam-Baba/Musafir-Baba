// @ts-check
/**
 * RequestContext — passed explicitly to every service and repository method.
 * The tenant (org) comes ONLY from here, never from the request body or query
 * (docs/plan/01-architecture.md §6, 03-security-baseline.md).
 */
import { systemClock } from './clock.js';

/** @typedef {'WEBSITE' | 'B2B_PORTAL' | 'B2B_API' | 'HOTEL_PORTAL' | 'ADMIN' | 'SYSTEM'} Channel */

/**
 * @typedef {{ type: 'anonymous' }
 *   | { type: 'customer', customerId: string }
 *   | { type: 'staff', staffId: string, permissions: readonly string[] }
 *   | { type: 'user', userId: string, sessionId: string }
 *   | { type: 'member', userId: string, orgId: string, permissions: readonly string[], sessionId?: string,
 *       orgType?: 'PLATFORM' | 'CLIENT' | 'HOTEL', branchIds?: readonly string[], propertyIds?: readonly string[], ownOnly?: boolean }
 *   | { type: 'system', reason: string }} Actor
 */

/**
 * @typedef {Readonly<{ requestId: string, channel: Channel, actor: Actor,
 *   clock: import('./clock.js').Clock, logger: import('./logger.js').Logger }>} RequestContext
 */

/**
 * @param {{ requestId: string, channel: Channel, actor: Actor, logger: import('./logger.js').Logger, clock?: import('./clock.js').Clock }} input
 * @returns {RequestContext}
 */
export function createContext(input) {
  return Object.freeze({
    requestId: input.requestId,
    channel: input.channel,
    actor: Object.freeze({ ...input.actor }),
    clock: input.clock ?? systemClock,
    logger: input.logger.child({ requestId: input.requestId, channel: input.channel, actor: input.actor.type }),
  });
}

/**
 * Context for background work (jobs, reconciler). A reason is required and logged,
 * because system context may cross tenants (tenant plugin's SYSTEM scope).
 * @param {string} reason
 * @param {string} requestId
 * @param {import('./logger.js').Logger} logger
 * @param {import('./clock.js').Clock} [clock]
 * @returns {RequestContext}
 */
export function systemContext(reason, requestId, logger, clock) {
  if (!reason.trim()) throw new Error('[b2b] systemContext needs a reason');
  return createContext({ requestId, channel: 'SYSTEM', actor: { type: 'system', reason }, logger, ...(clock ? { clock } : {}) });
}
