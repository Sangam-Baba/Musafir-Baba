// @ts-check
/** Stage 06 wiring: hotel search routes, through hotel-catalog / hotel-inventory / pricing / kyc public interfaces. */
import express from 'express';

import { createSearchCatalog } from '../modules/hotel-catalog/index.js';
import { createAvailabilityService, createPlanTermsService } from '../modules/hotel-inventory/index.js';
import { createDestinationsService, createSearchService } from '../modules/hotel-search/index.js';
import { createGstRegistrations } from '../modules/kyc/index.js';
import { createQuoteService } from '../modules/pricing/index.js';
import { hotelSearchRoutes } from './hotel-search.js';
import { createSearchGate } from './search-gateway.js';

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 */
export function stage06Routes(env, clock, identity) {
  const router = express.Router();
  const catalog = createSearchCatalog({ clock });
  const gate = createSearchGate({ clock, orgInfo: (orgId) => identity.orgs.basicInfo(orgId) });
  const availability = createAvailabilityService({ clock });
  const terms = createPlanTermsService();
  const quotes = createQuoteService({ clock });
  const gst = createGstRegistrations({ clock, fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET });
  const search = createSearchService({
    clock,
    candidates: (q) => catalog.candidates(q),
    availability: (q) => availability.checkAvailability(q),
    planTerms: (ids) => terms.termsOf(ids),
    quote: (q) => quotes.quote(q),
    gstRegistered: async (orgId) => (await gst.gstStatus(orgId)).registered,
  });
  const destinations = createDestinationsService({ clock, source: (q) => catalog.destinationSource(q) });
  router.use(hotelSearchRoutes({ gate, destinations, search }));
  return router;
}
