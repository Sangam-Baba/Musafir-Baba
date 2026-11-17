// @ts-check
/**
 * The member-permission cache (plan Stage 01 §3.4: 60 s, cleared on role/member changes).
 * - Key `member:<orgId>:<userId>:` → the member actor (roles, permissions, limits). Misses are not cached.
 * - accessChanged(orgId, userId?) is called by the services right after a change: it clears this
 *   process's caches at once and publishes a `cache:evict` signal so every other backend process
 *   clears them within about a second. If publishing fails, the 60 s expiry still bounds staleness.
 */
import { createCache, evictCachedPrefix } from '../core/cache.js';
import { publishCacheEvict } from '../core/realtime/signals.js';

export const MEMBER_CACHE_TTL_MS = 60_000;

/** @param {string} orgId @param {string} userId */
export const memberCacheKey = (orgId, userId) => `member:${orgId}:${userId}:`;

/**
 * @template V
 * @param {import('../core/clock.js').Clock} clock
 */
export const createMemberCache = (clock) =>
  /** @type {ReturnType<typeof createCache<any>>} */ (createCache({ max: 10_000, ttlMs: MEMBER_CACHE_TTL_MS, clock, shared: true }));

/**
 * @param {{ clock: import('../core/clock.js').Clock, logger: import('../core/logger.js').Logger }} deps
 * @returns {(orgId: string, userId?: string) => void}
 */
export function createAccessChangeNotifier(deps) {
  return (orgId, userId) => {
    const prefix = userId ? memberCacheKey(orgId, userId) : `member:${orgId}:`;
    evictCachedPrefix(prefix);
    publishCacheEvict(prefix, deps).catch((/** @type {unknown} */ error) => {
      deps.logger.warn({ err: error, prefix }, 'access cache: evict signal not published (entries expire within 60 s)');
    });
  };
}
