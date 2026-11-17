// @ts-check
/**
 * The /api/v1 router — every B2B + hotel endpoint hangs off this.
 * Loaded lazily by ../mount.js. It has its own body parser, 404 and RFC 9457 error
 * handling, so requests never reach the existing app's middleware or routes.
 */
import express from 'express';

import { startBackground } from '../background.js';
import { systemClock } from '../core/clock.js';
import { loadConfig } from '../core/config.js';
import { emailSenderFromConfig } from '../core/email.js';
import { b2bMongoose, connectB2BDatabase } from '../core/db/connection.js';
import { checkHealth } from '../core/health.js';
import { assertRegisteredModelsAllowed } from '../core/db/model.js';
import { contextMiddleware, contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { notFoundHandler, problemHandler } from '../core/http/problem.js';
import { requestTimeout, securityHeaders } from '../core/http/protection.js';
import { requestId } from '../core/http/request-id.js';
import { logger as defaultLogger } from '../core/logger.js';
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
import { publicStoreFromEnv } from '../modules/files/index.js';
import { kycRoutes } from './kyc.js';
import { notificationRoutes } from './notifications.js';
import { registrationRoutes } from './registrations.js';
import { createKycRetention, RETENTION_EVERY_MS } from '../flows/kyc-retention.js';
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
} from '../modules/hotel-catalog/index.js';
import { createGstRegistrations, createKycReviewService, createKycService } from '../modules/kyc/index.js';
import { createNotificationsService } from '../modules/notifications/index.js';
import {
  createCalendarEditService,
  createCalendarService,
  createCancellationPolicyService,
  createRatePlanService,
  extendCalendarWindow,
} from '../modules/hotel-inventory/index.js';
import { createAdminAuthenticator } from './admin-auth.js';
import { firstMatch } from './legacy-auth.js';
import { createViewAsAuthenticator, viewAsReadOnly, viewAsRoutes } from './view-as.js';
import { createViewAsService } from '../modules/identity/index.js';
import { createStaffRoles } from './admin-wiring.js';
import { realtimeRoutes } from './realtime.js';

const BODY_LIMIT = '1mb';
const REQUEST_TIMEOUT_MS = 15_000;

/** @typedef {ReturnType<typeof createStreamHub>} StreamHub */

/**
 * @param {{ env?: NodeJS.ProcessEnv, connect?: boolean, logger?: import('../core/logger.js').Logger,
 *   authenticate?: import('../core/http/context-middleware.js').Authenticator, timeoutMs?: number,
 *   clock?: import('../core/clock.js').Clock, hub?: StreamHub }} [options]
 *   connect: false (tests) = no database connection and no background work.
 * @returns {import('express').Router}
 */
export function createB2BRouter(options = {}) {
  const env = options.env ?? process.env;
  const log = options.logger ?? defaultLogger;
  const clock = options.clock ?? systemClock;
  assertRegisteredModelsAllowed();
  const hub =
    options.hub ??
    createStreamHub({ clock, logger: log, readSince: readSignalsSince, objectIdFrom: (hex) => new b2bMongoose.Types.ObjectId(hex) });
  if (options.connect !== false) startDatabase(env, log, hub);

  const accessChanged = createAccessChangeNotifier({ clock, logger: log });
  const roles = createRoles(clock, accessChanged);
  const identity = createIdentity(env, clock, roles.permissionsOf, createMemberCache(clock));
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
  router.use(stage03Routes(env, clock, identity));
  router.use(stage04Routes(clock));
  router.use('/realtime', realtimeRoutes({ hub }));

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
 */
function stage04Routes(clock) {
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
  return router;
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
  };
}

/**
 * Unfinished registrations: reminder, then removal (S02-T11).
 * @param {NodeJS.ProcessEnv} env
 * @param {ReturnType<typeof loadConfig>} config
 * @param {import('../core/logger.js').Logger} log
 */
function retentionSchedule(env, config, log) {
  const retention = createKycRetention({
    clock: systemClock,
    logger: log,
    files: createFiles(env, systemClock),
    secret: config.B2B_AUTH_SECRET,
    remindAfterDays: config.B2B_KYC_REMIND_DAYS,
    purgeAfterDays: config.B2B_KYC_PURGE_DAYS,
  });
  return { name: 'kyc-retention', everyMs: RETENTION_EVERY_MS, run: () => retention.runOnce() };
}

/** Stage 04: keep every known room type's calendar 365 days ahead (new nights start with 0 rooms). */
const CALENDAR_WINDOW_SCHEDULE = {
  name: 'inventory-calendar-window',
  everyMs: 6 * 60 * 60_000,
  run: () => extendCalendarWindow({ clock: systemClock }),
};

/**
 * Connects the B2B Mongoose instance, then starts the background work (../background.js).
 * A failure only affects /api/v1 (health reports `down`); the existing app has its own connection.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/logger.js').Logger} log
 * @param {StreamHub} hub
 */
function startDatabase(env, log, hub) {
  const config = loadConfig(env);
  const email = config.B2B_AUTH_SECRET ? { sender: emailSenderFromConfig(config, log), secret: config.B2B_AUTH_SECRET } : null;
  connectB2BDatabase(config.MONGO_URI, 'api')
    .then(() =>
      startBackground({
        clock: systemClock,
        logger: log,
        runJobs: config.B2B_BACKGROUND === 'true',
        hub,
        email,
        publicUrl: config.B2B_PUBLIC_URL,
        schedules: [retentionSchedule(env, config, log), CALENDAR_WINDOW_SCHEDULE],
      }),
    )
    .catch((error) => {
      log.error({ err: error }, 'b2b database connection or background start failed');
    });
}
