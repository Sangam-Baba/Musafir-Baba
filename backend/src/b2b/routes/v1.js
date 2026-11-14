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
  const router = express.Router();
  router.use(securityHeaders());
  router.use(requestTimeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS));
  router.use(requestId);
  router.use(express.json({ limit: BODY_LIMIT }));
  router.use(contextMiddleware({ channel: 'WEBSITE', logger: log, authenticate: options.authenticate ?? identity.authenticate }));

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
  router.use(createTeamRoutes({ env, clock, roles, identity, accessChanged }));
  router.use('/realtime', realtimeRoutes({ hub }));

  router.use(notFoundHandler());
  router.use(problemHandler(log));
  return router;
}

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
    .then(() => startBackground({ clock: systemClock, logger: log, runJobs: config.B2B_BACKGROUND === 'true', hub, email }))
    .catch((error) => {
      log.error({ err: error }, 'b2b database connection or background start failed');
    });
}
