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
export { WEBSITE_CALLER } from './domain/caller.js';
/** @typedef {import('./domain/caller.js').SearchCaller} SearchCaller */
export { DEFAULT_PAGE, MAX_PAGE, SORTS, rankResults, encodeCursor, decodeCursor, queryKey } from './domain/search.js';
export { createSearchService, priceOptions } from './search.service.js';
export { createOffersService } from './offers.service.js';
