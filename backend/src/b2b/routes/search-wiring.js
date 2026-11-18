// @ts-check
/** Stage 06 wiring: hotel search routes, through hotel-catalog / hotel-inventory / pricing / kyc public interfaces. */
import express from 'express';

import { createSearchCatalog } from '../modules/hotel-catalog/index.js';
import { createAvailabilityService, createPlanTermsService } from '../modules/hotel-inventory/index.js';
import { createDestinationsService, createOffersService, createSearchService } from '../modules/hotel-search/index.js';
import { createGstRegistrations } from '../modules/kyc/index.js';
import { createPriceTokenService, createQuoteService } from '../modules/pricing/index.js';
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
  /** @type {import('../modules/hotel-search/search.service.js').SearchDeps} */
  const searchDeps = {
    clock,
    candidates: (q) => catalog.candidates(q),
    availability: (q) => availability.checkAvailability(q),
    planTerms: (ids) => terms.termsOf(ids),
    quote: (q) => quotes.quote(q),
    gstRegistered: async (orgId) => (await gst.gstStatus(orgId)).registered,
  };
  const search = createSearchService(searchDeps);
  // created on first use: a server without B2B_AUTH_SECRET still serves everything else (offers answer 503-like errors)
  /** @type {ReturnType<typeof createPriceTokenService> | null} */
  let priceTokens = null;
  const tokens = () => (priceTokens ??= createPriceTokenService({ clock, secret: env.B2B_AUTH_SECRET ?? '' }));
  const offers = createOffersService({
    ...searchDeps,
    gstOf: (orgId) => search.gstOf(orgId),
    tokens: {
      issue: (buyer, stay, breakdown) => tokens().issue(buyer, stay, breakdown),
      read: (token, buyer) => tokens().read(token, buyer),
      verifyAndReprice: (token, req) => tokens().verifyAndReprice(token, req),
    },
  });
  const destinations = createDestinationsService({ clock, source: (q) => catalog.destinationSource(q) });
  router.use(hotelSearchRoutes({ gate, destinations, search, offers }));
  return router;
}

/**
 * Who may follow `availability:property:<id>` rooms: anyone for a LIVE property; a hotel's own people for their
 * unpublished ones (the calendar page); MusafirBaba staff for any. Unknown properties never.
 * @param {import('../core/clock.js').Clock} clock
 */
export function followCheck(clock) {
  const catalog = createSearchCatalog({ clock });
  /** @param {import('../core/context.js').Actor} actor @param {string[]} rooms */
  return async (actor, rooms) => {
    const ids = rooms.map((r) => r.slice('availability:property:'.length));
    const found = await catalog.statusOf(ids);
    if (found.length !== new Set(ids).size) return false;
    return found.every((p) => p.status === 'LIVE' || actor.type === 'staff' || (actor.type === 'member' && actor.orgId === p.hotelOrgId));
  };
}
