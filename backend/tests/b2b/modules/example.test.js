// @ts-check
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMigrationContext } from '../../../src/b2b/core/db/migrations.js';
import { contextMiddleware } from '../../../src/b2b/core/http/context-middleware.js';
import { notFoundHandler, problemHandler } from '../../../src/b2b/core/http/problem.js';
import { createLogger } from '../../../src/b2b/core/logger.js';
import { createExampleRepository } from '../../../src/b2b/modules/example/repository.js';
import { createExampleService, createRoutes, ITEMS_COLLECTION, PERMISSIONS } from '../../../src/b2b/modules/example/index.js';
import { startServer } from '../helpers/http.js';
import { startMongo } from '../helpers/mongo.js';

const quiet = createLogger({ write: () => {} });
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

/** @param {string} orgId @param {string[]} permissions */
function appFor(orgId, permissions) {
  const app = express();
  const r = express.Router();
  r.use(express.json());
  r.use(
    contextMiddleware({
      channel: 'B2B_PORTAL',
      logger: quiet,
      authenticate: async () => ({ type: 'member', userId: 'u', orgId, permissions }),
    }),
  );
  r.use(createRoutes(createExampleService({ repository: createExampleRepository() })));
  r.use(notFoundHandler(), problemHandler(quiet));
  app.use((_req, res, next) => {
    res.locals.requestId = 'test';
    next();
  });
  app.use('/api/v1/example', r);
  return app;
}

beforeAll(async () => {
  mongo = await startMongo();
  await createMigrationContext(mongo.db).createCollection(ITEMS_COLLECTION);
});
afterAll(async () => mongo.stop());

describe('example module (generated)', () => {
  const all = [PERMISSIONS.itemRead, PERMISSIONS.itemCreate];

  it("creates and lists items for the caller's org only", async () => {
    const a = await startServer(appFor('org-a', all));
    const b = await startServer(appFor('org-b', all));
    try {
      expect((await a.post('/api/v1/example/items', { name: '  Deluxe   Room ' })).body).toMatchObject({ name: 'Deluxe Room' });
      expect((await a.get('/api/v1/example/items')).body.data).toHaveLength(1);
      expect((await b.get('/api/v1/example/items')).body.data).toEqual([]);
    } finally {
      await a.close();
      await b.close();
    }
  });

  it('enforces permissions and validation', async () => {
    const readOnly = await startServer(appFor('org-a', [PERMISSIONS.itemRead]));
    try {
      expect((await readOnly.post('/api/v1/example/items', { name: 'x' })).status).toBe(403);
    } finally {
      await readOnly.close();
    }
    const writer = await startServer(appFor('org-a', all));
    try {
      expect((await writer.post('/api/v1/example/items', { name: 'x', orgId: 'org-b' })).status).toBe(400);
      expect((await writer.post('/api/v1/example/items', { name: { $ne: null } })).status).toBe(400);
    } finally {
      await writer.close();
    }
  });
});
