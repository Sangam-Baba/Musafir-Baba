// @ts-check
/**
 * The /api/v1 router — every B2B + hotel endpoint hangs off this.
 * Loaded lazily by ../mount.js. It has its own body parser, 404 and RFC 9457 error
 * handling, so requests never reach the existing app's middleware or routes.
 */
import express from 'express';

import { loadConfig } from '../core/config.js';
import { connectB2BDatabase } from '../core/db/connection.js';
import { checkHealth } from '../core/health.js';
import { assertRegisteredModelsAllowed } from '../core/db/model.js';
import { contextMiddleware, contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { notFoundHandler, problemHandler } from '../core/http/problem.js';
import { requestTimeout, securityHeaders } from '../core/http/protection.js';
import { requestId } from '../core/http/request-id.js';
import { logger as defaultLogger } from '../core/logger.js';
import { realtimeRoutes } from './realtime.js';

const BODY_LIMIT = '1mb';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * @param {{ env?: NodeJS.ProcessEnv, connect?: boolean, logger?: import('../core/logger.js').Logger,
 *   authenticate?: import('../core/http/context-middleware.js').Authenticator, timeoutMs?: number }} [options]
 * @returns {import('express').Router}
 */
export function createB2BRouter(options = {}) {
  const env = options.env ?? process.env;
  const log = options.logger ?? defaultLogger;
  assertRegisteredModelsAllowed();
  if (options.connect !== false) startDatabase(env, log);

  const router = express.Router();
  router.use(securityHeaders());
  router.use(requestTimeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS));
  router.use(requestId);
  router.use(express.json({ limit: BODY_LIMIT }));
  router.use(
    contextMiddleware({ channel: 'WEBSITE', logger: log, ...(options.authenticate ? { authenticate: options.authenticate } : {}) }),
  );

  router.get('/health', publicRoute(), (_req, res, next) => {
    checkHealth(contextOf(res).clock)
      .then((health) => res.status(health.status === 'down' ? 503 : 200).json(health))
      .catch(next);
  });

  router.get('/meta/version', publicRoute(), (_req, res) => {
    res.json({ name: 'musafirbaba-b2b', version: process.env.B2B_VERSION ?? 'dev' });
  });

  router.use('/realtime', realtimeRoutes({ secret: env.B2B_REALTIME_SECRET }));

  router.use(notFoundHandler());
  router.use(problemHandler(log));
  return router;
}

/**
 * Connects the B2B Mongoose instance in the background. A failure only affects
 * /api/v1 (health reports `down`); the existing app has its own connection.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/logger.js').Logger} log
 */
function startDatabase(env, log) {
  const { MONGO_URI } = loadConfig(env);
  connectB2BDatabase(MONGO_URI, 'api').catch((error) => {
    log.error({ err: error }, 'b2b database connection failed');
  });
}
