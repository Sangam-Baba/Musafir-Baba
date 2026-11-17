// @ts-check
/**
 * Small in-process cache with a size limit (least-recently-used eviction) and per-entry TTL.
 * No dependency. Used for short-lived lookups (entitlements, API keys, optional search
 * results). Each process has its own copy; entries are cleared early by `cache:evict`
 * signals (S00-T15): the signal reader calls `evictCachedPrefix`, which runs `deletePrefix`
 * on every cache created with `shared: true`. Never the source of truth.
 */

/** @type {Set<{ deletePrefix: (prefix: string) => void }>} */
const sharedCaches = new Set();

/**
 * Drops keys starting with `prefix` from every shared cache in this process (called for `cache:evict` signals).
 * @param {string} prefix
 */
export function evictCachedPrefix(prefix) {
  for (const cache of sharedCaches) cache.deletePrefix(prefix);
}

/**
 * @template V
 * @param {{ max: number, ttlMs: number, clock: import('./clock.js').Clock, shared?: boolean }} options
 *   shared: true for long-lived module caches that must follow `cache:evict` signals
 */
export function createCache(options) {
  if (!Number.isSafeInteger(options.max) || options.max < 1) throw new Error('[b2b] cache max must be >= 1');
  /** @type {Map<string, { value: V, expiresAt: number }>} */
  const entries = new Map();
  const now = () => options.clock.now().getTime();

  const cache = {
    /** @param {string} key @returns {V | undefined} */
    get(key) {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key); // re-insert = most recently used
      entries.set(key, hit);
      return hit.value;
    },
    /** @param {string} key @param {V} value @param {number} [ttlMs] */
    set(key, value, ttlMs = options.ttlMs) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > options.max) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    /** @param {string} key */
    delete(key) {
      entries.delete(key);
    },
    /** @param {string} prefix e.g. 'property:MBHT-123:' */
    deletePrefix(prefix) {
      for (const key of [...entries.keys()]) if (key.startsWith(prefix)) entries.delete(key);
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    },
  };
  if (options.shared) sharedCaches.add(cache);
  return cache;
}
