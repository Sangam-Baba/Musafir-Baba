// @ts-check
/**
 * The /api/v1 router — every B2B + hotel endpoint hangs off this.
 * Loaded lazily by ../mount.js. It has its own body parser and error handling;
 * unmatched requests end here (mount.js answers 404) and never reach the existing app.
 */
import express from 'express';

import { loadConfig } from '../core/config.js';
import { connectB2BDatabase, databaseState } from '../core/db/connection.js';
import { assertRegisteredModelsAllowed } from '../core/db/model.js';
import { requestId } from '../core/http/request-id.js';

const BODY_LIMIT = '1mb';

/**
 * @param {{ env?: NodeJS.ProcessEnv, connect?: boolean }} [options]
 * @returns {import('express').Router}
 */
export function createB2BRouter(options = {}) {
  const env = options.env ?? process.env;
  assertRegisteredModelsAllowed();
  if (options.connect !== false) startDatabase(env);

  const router = express.Router();
  router.use(requestId);
  router.use(express.json({ limit: BODY_LIMIT }));

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', database: databaseState() });
  });

  router.get('/meta/version', (_req, res) => {
    res.json({ name: 'musafirbaba-b2b', version: process.env.B2B_VERSION ?? 'dev' });
  });

  return router;
}

/**
 * Connects the B2B Mongoose instance in the background. A failure only affects
 * /api/v1 (health reports `down`); the existing app has its own connection.
 * @param {NodeJS.ProcessEnv} env
 */
function startDatabase(env) {
  const { MONGO_URI } = loadConfig(env);
  connectB2BDatabase(MONGO_URI, 'api').catch((error) => {
    console.error('[b2b] database connection failed:', error instanceof Error ? error.message : error);
  });
}
