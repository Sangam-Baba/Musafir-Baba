// @ts-check
/** Stage 06 wiring: hotel search routes, through hotel-catalog / hotel-inventory / pricing / kyc public interfaces. */
import express from 'express';

import { createSearchCatalog } from '../modules/hotel-catalog/index.js';
import { createDestinationsService } from '../modules/hotel-search/index.js';
import { hotelSearchRoutes } from './hotel-search.js';
import { createSearchGate } from './search-gateway.js';

/**
 * @param {NodeJS.ProcessEnv} _env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 */
export function stage06Routes(_env, clock, identity) {
  const router = express.Router();
  const catalog = createSearchCatalog({ clock });
  const gate = createSearchGate({ clock, orgInfo: (orgId) => identity.orgs.basicInfo(orgId) });
  router.use(hotelSearchRoutes({ gate, destinations: createDestinationsService({ clock, source: (q) => catalog.destinationSource(q) }) }));
  return router;
}
