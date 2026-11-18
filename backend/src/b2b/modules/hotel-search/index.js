// @ts-check
/** PUBLIC interface of the hotel-search module — other modules import only from here. */
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { MAX_SUGGESTIONS, normalise, buildIndex, suggest } from './domain/destinations.js';
export {
  SEARCH_CACHE_PREFIX,
  DESTINATIONS_TTL_MS,
  destinationsOf,
  createDestinationsService,
  createSearchCacheSignals,
} from './destinations.service.js';
