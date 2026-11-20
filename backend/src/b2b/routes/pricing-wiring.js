// @ts-check
/**
 * Stage 05 wiring: margin rules, GST rates and settings, client markups, and the simulator (which reads the
 * property and its real calendar through hotel-catalog / hotel-inventory / kyc public interfaces).
 */
import express from 'express';

import { createAdminListingService, createPropertyService } from '../modules/hotel-catalog/index.js';
import { createAvailabilityService } from '../modules/hotel-inventory/index.js';
import { createGstRegistrations } from '../modules/kyc/index.js';
import {
  createMarkupService,
  createQuoteService,
  createRuleAdminService,
  createSimulatorService,
  createTaxAdminService,
} from '../modules/pricing/index.js';
import { ownOrgCheck } from './kyc-admin.js';
import { pricingMarkupRoutes } from './pricing-markups.js';
import { pricingRuleAdminRoutes } from './pricing-rules-admin.js';
import { pricingSimulatorRoutes } from './pricing-simulator.js';
import { pricingTaxAdminRoutes } from './pricing-tax-admin.js';

const REACH_LIMIT = 200;

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 * @param {import('../core/logger.js').Logger} log
 */
export function stage05Routes(env, clock, identity, log) {
  const router = express.Router();
  const rules = createRuleAdminService({ clock });
  router.use(pricingRuleAdminRoutes({ rules }));
  router.use(pricingTaxAdminRoutes({ taxes: createTaxAdminService({ clock, logger: log }) }));
  router.use(pricingMarkupRoutes({ markups: createMarkupService() }));
  router.use(pricingSimulatorRoutes(simulatorDeps(env, clock, identity, rules)));
  return router;
}

/**
 * The simulator's view of a property and its calendar, through hotel-catalog / hotel-inventory / kyc.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 * @param {ReturnType<typeof createRuleAdminService>} rules
 * @returns {import('./pricing-simulator.js').SimulatorDeps}
 */
function simulatorDeps(env, clock, identity, rules) {
  const gst = createGstRegistrations({ clock, fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET });
  const properties = createPropertyService({ clock, gstStatus: gst.gstStatus });
  const listing = createAdminListingService({
    clock,
    properties,
    orgInfo: (orgId) => identity.orgs.basicInfo(orgId),
    isOwnOrg: ownOrgCheck(identity),
  });
  const availability = createAvailabilityService({ clock });
  return {
    simulator: createSimulatorService({ clock, quotes: createQuoteService({ clock }) }),
    rules,
    propertyFacts: async (id) => {
      const { raw } = await properties.viewById(id);
      const detail = await listing.detail(id);
      return {
        id,
        name: raw.name,
        hotelOrgId: raw.hotelOrgId,
        cityId: raw.cityId ?? null,
        starRating: raw.starRating ?? null,
        stateCode: raw.stateCode ?? null,
        timeZone: raw.timeZone,
        gstRegistered: (await gst.gstStatus(raw.hotelOrgId)).registered,
        roomTypes: detail.roomTypes
          .filter((r) => r.status === 'ACTIVE')
          .map((r) => ({ id: r.id, name: r.name, maxOccupancy: r.maxOccupancy })),
      };
    },
    // the simulator prices; guest limits per adult / child aren't its job, so only the room's total is checked
    offersFor: async (p, stay) => {
      const roomTypes = p.roomTypes.map((r) => ({
        id: r.id,
        maxAdults: r.maxOccupancy,
        maxChildren: r.maxOccupancy,
        maxOccupancy: r.maxOccupancy,
      }));
      const q = {
        properties: [{ id: p.id, timeZone: p.timeZone, roomTypes }],
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        groups: stay.rooms,
      };
      return (await availability.checkAvailability(q))[0]?.offers ?? [];
    },
    reach: (match) => reachOf(listing, properties, match),
  };
}

/**
 * How many LIVE properties a rule's match covers (at most REACH_LIMIT looked at).
 * @param {ReturnType<typeof createAdminListingService>} listing
 * @param {ReturnType<typeof createPropertyService>} properties
 * @param {Record<string, unknown>} match
 */
async function reachOf(listing, properties, match) {
  const filter = {
    status: 'LIVE',
    cityId: /** @type {string | undefined} */ (match.cityId),
    hotelOrgId: /** @type {string | undefined} */ (match.hotelOrgId),
    limit: REACH_LIMIT,
  };
  const live = await listing.list(filter);
  let hits = match.propertyId ? live.filter((p) => p.id === match.propertyId) : live;
  if (match.starRating !== undefined) {
    const stars = await Promise.all(hits.map(async (p) => (await properties.viewById(p.id)).raw.starRating ?? null));
    hits = hits.filter((_, i) => stars[i] === match.starRating);
  }
  return { count: hits.length, capped: live.length === REACH_LIMIT };
}
