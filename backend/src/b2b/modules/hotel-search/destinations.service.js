// @ts-check
/**
 * Destination autocomplete (S06-T03): an in-memory index per channel built from hotel-catalog's destination source,
 * kept 5 minutes per process and dropped at once when a listing changes (`cache:evict` of `search:`). No new
 * collection and no Atlas Search — a few thousand names are matched in well under a millisecond.
 */
import { createCache } from '../../core/cache.js';
import { publishCacheEvict } from '../../core/realtime/signals.js';
import { buildIndex, suggest } from './domain/destinations.js';

export const SEARCH_CACHE_PREFIX = 'search:';
export const DESTINATIONS_TTL_MS = 5 * 60_000;

/**
 * @typedef {{ cities: { id: string, name: string, slug: string, areas: { id: string, name: string, slug: string }[] }[],
 *   properties: { ref: string, slug: string, name: string, cityId: string | null, areaId: string | null }[] }} DestinationSource
 * @typedef {import('./domain/destinations.js').Destination} Destination
 */

/** @param {DestinationSource} src @returns {Destination[]} */
export function destinationsOf(src) {
  /** @type {Map<string, number>} */
  const count = new Map();
  for (const p of src.properties) {
    if (p.cityId) count.set(p.cityId, (count.get(p.cityId) ?? 0) + 1);
    if (p.areaId) count.set(p.areaId, (count.get(p.areaId) ?? 0) + 1);
  }
  const cityName = new Map(src.cities.map((c) => [c.id, c.name]));
  return [
    ...src.cities.map((c) => ({
      type: /** @type {const} */ ('CITY'),
      id: c.id,
      name: c.name,
      cityId: c.id,
      cityName: c.name,
      slug: c.slug,
      popularity: count.get(c.id) ?? 0,
    })),
    ...src.cities.flatMap((c) =>
      c.areas.map((a) => ({
        type: /** @type {const} */ ('AREA'),
        id: a.id,
        name: a.name,
        cityId: c.id,
        cityName: c.name,
        slug: a.slug,
        popularity: count.get(a.id) ?? 0,
      })),
    ),
    ...src.properties
      .filter((p) => p.cityId && cityName.has(p.cityId))
      .map((p) => ({
        type: /** @type {const} */ ('PROPERTY'),
        id: p.ref,
        name: p.name,
        cityId: /** @type {string} */ (p.cityId),
        cityName: /** @type {string} */ (cityName.get(/** @type {string} */ (p.cityId))),
        ref: p.ref,
        slug: p.slug,
        popularity: 0,
      })),
  ];
}

/**
 * @param {{ clock: import('../../core/clock.js').Clock,
 *   source: (q: { channel: 'WEBSITE' | 'B2B' }) => Promise<DestinationSource> }} deps
 */
export function createDestinationsService(deps) {
  /** @type {ReturnType<typeof createCache<ReturnType<typeof buildIndex>>>} */
  const cache = createCache({ max: 4, ttlMs: DESTINATIONS_TTL_MS, clock: deps.clock, shared: true });
  return {
    /** @param {'WEBSITE' | 'B2B'} channel @param {string} q */
    async suggest(channel, q) {
      const key = `${SEARCH_CACHE_PREFIX}destinations:${channel}`;
      let index = cache.get(key);
      if (!index) {
        index = buildIndex(destinationsOf(await deps.source({ channel })));
        cache.set(key, index);
      }
      return suggest(index, q);
    },
  };
}

/**
 * Consumer for listing events (published, updated, suspended, archived): every process drops its search caches.
 * @param {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger }} deps
 */
export function createSearchCacheSignals(deps) {
  return {
    async handle() {
      await publishCacheEvict(SEARCH_CACHE_PREFIX, deps).catch((error) =>
        deps.logger.warn({ err: error }, 'hotel-search: cache evict signal failed'),
      );
    },
  };
}
