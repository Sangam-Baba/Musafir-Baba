// @ts-check
/**
 * The /api/v1 router — every B2B + hotel endpoint hangs off this.
 * Loaded lazily by ../mount.js. It has its own body parser, 404 and RFC 9457 error
 * handling, so requests never reach the existing app's middleware or routes.
 */
import { startDatabase } from './background-wiring.js';
import express from 'express';
import { systemClock } from '../core/clock.js';
import { b2bMongoose } from '../core/db/connection.js';
import { checkHealth } from '../core/health.js';
import { assertRegisteredModelsAllowed } from '../core/db/model.js';
import { contextMiddleware, contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { notFoundHandler, problemHandler } from '../core/http/problem.js';
import { requestTimeout, securityHeaders } from '../core/http/protection.js';
import { requestId } from '../core/http/request-id.js';
import { logger as defaultLogger } from '../core/logger.js';
import { trustLoginRelay } from '../core/rate-limit.js';
import { readSignalsSince } from '../core/realtime/signals.js';
import { createStreamHub } from '../core/realtime/stream.js';
import { createIdentity } from './identity.js';
import { createAccessChangeNotifier, createMemberCache } from './access-cache.js';
import { createRoles, createTeamRoutes } from './teams.js';
import { createFiles, fileRoutes } from './files.js';
import { kycAdminRoutes, ownOrgCheck } from './kyc-admin.js';
import { masterRoutes } from './hotel-masters.js';
import { hotelPropertyRoutes } from './hotel-properties.js';
import { roomTypeRoutes } from './hotel-room-types.js';
import { photoRoutes } from './hotel-photos.js';
import { listingRoutes } from './hotel-listing.js';
import { hotelAdminRoutes } from './hotel-admin.js';
import { hotelContentRoutes } from './hotel-content.js';
import { cancellationPolicyRoutes } from './hotel-cancellation-policies.js';
import { ratePlanRoutes } from './hotel-rate-plans.js';
import { calendarRoutes } from './hotel-calendar.js';
import { calendarImportRoutes } from './hotel-calendar-import.js';
import { adminCalendarRoutes } from './hotel-calendar-admin.js';
import { stage05Routes } from './pricing-wiring.js';
import { followCheck, stage06Routes } from './search-wiring.js';
import { stage10Routes } from './client-wiring.js';
import { stage07Routes } from './payments-wiring.js';
import { stage11Routes } from './wallet.js';
import { stage08Routes } from './orders-wiring.js';
import { publicStoreFromEnv } from '../modules/files/index.js';
import { kycRoutes } from './kyc.js';
import { notificationRoutes } from './notifications.js';
import { registrationRoutes } from './registrations.js';
import {
  createAdminListingService,
  createContentService,
  createVisibilityService,
  createListingService,
  createMastersService,
  createPhotoService,
  createPropertyService,
  createRevisionService,
  createRoomTypeService,
  CityRecord,
} from '../modules/hotel-catalog/index.js';
import { createGstRegistrations, createKycReviewService, createKycService } from '../modules/kyc/index.js';
import { createNotificationsService } from '../modules/notifications/index.js';
import {
  createAdminCalendarService,
  createCalendarEditService,
  createCalendarImportService,
  createCalendarService,
  createCancellationPolicyService,
  createRatePlanService,
} from '../modules/hotel-inventory/index.js';
import { createAdminAuthenticator } from './admin-auth.js';
import { firstMatch } from './legacy-auth.js';
import { createViewAsAuthenticator, viewAsReadOnly, viewAsRoutes } from './view-as.js';
import { createViewAsService } from '../modules/identity/index.js';
import { createStaffRoles } from './admin-wiring.js';
import { realtimeRoutes } from './realtime.js';
import { apiKeysFor, createApiKeyAuthenticator } from './api-keys-wiring.js';
import { busCatalogRoutes } from './bus-catalog.js';
import { busSearchRoutes } from './bus-search.js';

const BODY_LIMIT = '1mb';
const REQUEST_TIMEOUT_MS = 15_000;

/** @typedef {ReturnType<typeof createStreamHub>} StreamHub */

/**
 * @param {{ env?: NodeJS.ProcessEnv, connect?: boolean, logger?: import('../core/logger.js').Logger,
 *   authenticate?: import('../core/http/context-middleware.js').Authenticator, timeoutMs?: number,
 *   clock?: import('../core/clock.js').Clock, hub?: StreamHub,
 *   canFollow?: (actor: import('../core/context.js').Actor, rooms: string[]) => Promise<boolean> }} [options]
 *   connect: false (tests) = no database connection and no background work.
 *   canFollow: tests of the stream itself may replace the "LIVE properties only" check.
 * @returns {import('express').Router}
 */
export function createB2BRouter(options = {}) {
  const env = options.env ?? process.env;
  const log = options.logger ?? defaultLogger;
  const clock = options.clock ?? systemClock;
  assertRegisteredModelsAllowed();
  trustLoginRelay(env.B2B_RELAY_SECRET); // the website's login relay may pass the visitor's IP (rate limits)
  const hub =
    options.hub ??
    createStreamHub({ clock, logger: log, readSince: readSignalsSince, objectIdFrom: (hex) => new b2bMongoose.Types.ObjectId(hex) });
  const accessChanged = createAccessChangeNotifier({ clock, logger: log });
  const roles = createRoles(clock, accessChanged);
  const identity = createIdentity(env, clock, roles.permissionsOf, createMemberCache(clock));
  if (options.connect !== false) startDatabase(env, log, hub, identity);
  const staffRoles = createStaffRoles(clock);
  const viewAsDeps = {
    viewAs: createViewAsService({ secret: env.B2B_AUTH_SECRET, clock }),
    orgs: identity.orgs,
    users: identity.users,
    mfa: identity.mfa,
    permissionsOf: roles.permissionsOf,
    secret: env.B2B_AUTH_SECRET,
    clock,
  };
  // business tokens, view-as passes, the B2B admin pass, then existing customer/admin logins (read-only)
  const authenticate = firstMatch(
    createApiKeyAuthenticator({ env, clock, keys: apiKeysFor(env, clock), resolveMember: identity.resolveMember }), // Stage 14 (off unless B2B_API_ENABLED)
    identity.businessAuthenticate,
    createViewAsAuthenticator(viewAsDeps),
    createAdminAuthenticator({ secret: env.B2B_AUTH_SECRET, clock, staffRoles }),
    identity.legacyAuthenticate,
  );
  const router = express.Router();
  router.use(securityHeaders());
  router.use(requestTimeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS));
  router.use(requestId);
  router.use(express.json({ limit: BODY_LIMIT }));
  router.use(contextMiddleware({ channel: 'WEBSITE', logger: log, authenticate: options.authenticate ?? authenticate }));
  router.use(viewAsReadOnly);

  router.get('/health', publicRoute(), (_req, res, next) => {
    checkHealth(contextOf(res).clock)
      .then((health) => res.status(health.status === 'down' ? 503 : 200).json(health))
      .catch(next);
  });

  router.get('/meta/version', publicRoute(), (_req, res) => {
    res.json({ name: 'musafirbaba-b2b', version: process.env.B2B_VERSION ?? 'dev' });
  });

  router.use('/auth', identity.auth);
  router.use('/me', identity.me);
  router.use(identity.account);
  router.use(createTeamRoutes({ env, clock, roles, identity, accessChanged, staffRoles }));
  router.use(viewAsRoutes(viewAsDeps));
  router.use(stage02Routes(env, clock, identity));
  router.use(stage06Routes(env, clock, identity)); // before Stage 03: `/hotels/destinations` must not be read as `/hotels/:ref`
  router.use(stage03Routes(env, clock, identity));
  router.use(stage04Routes(clock, identity), stage05Routes(env, clock, identity, log), stage10Routes(clock));
  router.use(stage07Routes(env, clock, log), stage08Routes(env, clock, log, identity), stage11Routes(env, clock, log));
  router.use('/realtime', realtimeRoutes({ hub, canFollow: options.canFollow ?? followCheck(clock) }));

  router.use(notFoundHandler());
  router.use(problemHandler(log));
  return router;
}

/**
 * Stage 02: documents, hotel registration, KYC (hotel and admin side), the bell.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof createIdentity>} identity
 */
function stage02Routes(env, clock, identity) {
  const router = express.Router();
  const files = createFiles(env, clock);
  const kyc = createKycService({ clock, files, fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET });
  router.use(fileRoutes(files));
  // Stage 18 (503 unless B2B_BUS_ENABLED); bus points use the shared city list (read only)
  const cityExists = async (/** @type {string} */ id) =>
    /^[a-f0-9]{24}$/.test(id) && Boolean(await CityRecord.exists({ _id: id, active: true }));
  router.use(busCatalogRoutes({ clock, env, files, cityExists }));
  const stateOf = async (/** @type {string} */ id) =>
    /^[a-f0-9]{24}$/.test(id) ? ((await CityRecord.findById(id, { stateCode: 1 }).lean())?.stateCode ?? null) : null;
  router.use(busSearchRoutes({ clock, env, stateOf })); // B5: 503 unless B2B_BUS_SELLING_ENABLED too
  router.use(registrationRoutes(registrationDeps(env, clock, identity, kyc)));
  const isOwnOrg = ownOrgCheck(identity);
  const gst = createGstRegistrations({ clock, files, fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET, isOwnOrg });
  router.use(kycRoutes({ kyc, users: identity.users, orgs: identity.orgs, gst }));
  router.use(kycAdminRoutes({ review: createKycReviewService({ clock, isOwnOrg }), kyc, gst }));
  router.use(notificationRoutes({ notifications: createNotificationsService({ clock }) }));
  return router;
}

/**
 * Stage 03: hotel master lists and properties.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof createIdentity>} identity
 */
function stage03Routes(env, clock, identity) {
  const router = express.Router();
  const gst = createGstRegistrations({ clock, fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET });
  router.use(masterRoutes({ masters: createMastersService() }));
  const store = publicStoreFromEnv(env);
  const properties = createPropertyService({ clock, gstStatus: gst.gstStatus, mediaUrl: store.url });
  router.use(hotelPropertyRoutes({ properties }));
  router.use(roomTypeRoutes({ roomTypes: createRoomTypeService({ clock, properties }) }));
  router.use(photoRoutes({ photos: createPhotoService({ properties, store, clock }), properties, store }));
  const orgStatus = async (/** @type {string} */ orgId) => (await identity.orgs.basicInfo(orgId))?.status ?? null;
  const revisions = createRevisionService({ clock, properties, isOwnOrg: ownOrgCheck(identity) });
  router.use(listingRoutes({ listing: createListingService({ clock, properties, orgStatus }), revisions }));
  const adminListing = createAdminListingService({
    clock,
    properties,
    orgInfo: (orgId) => identity.orgs.basicInfo(orgId),
    isOwnOrg: ownOrgCheck(identity),
    mediaUrl: store.url,
  });
  router.use(hotelAdminRoutes({ revisions, adminListing, properties }));
  router.use(
    hotelContentRoutes({
      content: createContentService({ clock, mediaUrl: store.url }),
      visibility: createVisibilityService({ clock, properties }),
    }),
  );
  return router;
}

/**
 * Stage 04: rooms, prices and rules per night. Properties are read through hotel-catalog's own service
 * (`loadOwned` — same access checks and property limits as Stage 03).
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof createIdentity>} identity
 */
function stage04Routes(clock, identity) {
  const router = express.Router();
  const properties = createPropertyService({ clock });
  const roomTypes = createRoomTypeService({ clock, properties });
  const masters = createMastersService();
  /** @type {(ctx: import('../core/context.js').RequestContext, propertyId: string) => Promise<{ id: string, name: string, maxOccupancy: number }[]>} */
  const roomTypesOf = async (ctx, propertyId) =>
    (await roomTypes.list(ctx, propertyId)).map((r) => ({ id: r.id, name: r.name, maxOccupancy: r.maxOccupancy }));
  router.use(cancellationPolicyRoutes({ policies: createCancellationPolicyService({ properties }) }));
  const ratePlans = createRatePlanService({
    properties,
    roomTypesOf,
    mealPlanKeys: async () => (await masters.list()).mealPlans.map((/** @type {{ key: string }} */ m) => m.key),
  });
  router.use(ratePlanRoutes({ ratePlans }));
  router.use(
    calendarRoutes({
      calendar: createCalendarService({ properties, roomTypesOf, clock }),
      edits: createCalendarEditService({ properties, roomTypesOf, clock }),
      clock,
    }),
  );
  router.use(calendarImportRoutes({ imports: createCalendarImportService({ properties, roomTypesOf, clock }), clock }));
  router.use(adminCalendarRoutes({ adminCalendar: adminCalendarService(clock, identity, properties) }));
  return router;
}

/**
 * Admin calendars: the property and its active room types through hotel-catalog's own admin read.
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof createIdentity>} identity
 * @param {ReturnType<typeof createPropertyService>} properties
 */
function adminCalendarService(clock, identity, properties) {
  const listing = createAdminListingService({
    clock,
    properties,
    orgInfo: (orgId) => identity.orgs.basicInfo(orgId),
    isOwnOrg: ownOrgCheck(identity),
  });
  return createAdminCalendarService({
    clock,
    isOwnOrg: ownOrgCheck(identity),
    adminProperty: async (id) => {
      const detail = await listing.detail(id);
      const { raw } = await properties.viewById(id);
      const roomTypes = detail.roomTypes
        .filter((r) => r.status === 'ACTIVE')
        .map((r) => ({ id: r.id, name: r.name, maxOccupancy: r.maxOccupancy }));
      return { raw, roomTypes };
    },
  });
}

/**
 * Hotel self-registration wiring (S02-T05).
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof createIdentity>} identity
 * @param {ReturnType<typeof createKycService>} kyc
 */
function registrationDeps(env, clock, identity, kyc) {
  return {
    users: identity.users,
    sessions: identity.sessions,
    orgs: identity.orgs,
    kyc,
    secret: env.B2B_AUTH_SECRET,
    publicUrl: env.B2B_PUBLIC_URL || 'https://musafirbaba.com',
    secureCookies: identity.secureCookies,
    clock,
    busEnabled: env.B2B_BUS_ENABLED === 'true', // Stage 18: operator registration
  };
}
