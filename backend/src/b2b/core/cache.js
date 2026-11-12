// @ts-check
/**
 * Small in-process cache with a size limit (least-recently-used eviction) and per-entry TTL.
 * No dependency. Used for short-lived lookups (entitlements, API keys, optional search
 * results). Each process has its own copy; entries are cleared early by `cache:evict`
 * signals (S00-T15) via `deletePrefix`. Never the source of truth.
 */

/**
 * @template V
 * @param {{ max: number, ttlMs: number, clock: import('./clock.js').Clock }} options
 */
export function createCache(options) {
  if (!Number.isSafeInteger(options.max) || options.max < 1) throw new Error('[b2b] cache max must be >= 1');
  /** @type {Map<string, { value: V, expiresAt: number }>} */
  const entries = new Map();
  const now = () => options.clock.now().getTime();

  return {
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
}
