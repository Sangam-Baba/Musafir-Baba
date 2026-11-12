// @ts-check
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { mountB2B } from '../../src/b2b/mount.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';

/** A stand-in for the existing app's stack: records whether it was reached. */
function existingStack() {
  const app = express();
  const reached = { count: 0 };
  return { app, reached };
}

/** @param {{ app: import('express').Express, reached: { count: number } }} stack */
function addExistingRoutes({ app, reached }) {
  app.use((_req, res) => {
    reached.count += 1;
    res.status(418).json({ from: 'existing-app' });
  });
}

const ON = { B2B_ENABLED: 'true' };
const workingLoad = async () => ({ createB2BRouter: () => createB2BRouter({ connect: false }) });

/** @type {Awaited<ReturnType<typeof startServer>> | undefined} */
let server;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('mountB2B — flag off (default)', () => {
  it('adds nothing: /api/v1 requests go to the existing app exactly as today', async () => {
    const stack = existingStack();
    expect(mountB2B(stack.app, { env: {} })).toBe(false);
    addExistingRoutes(stack);
    server = await startServer(stack.app);

    const res = await server.get('/api/v1/health');
    expect(res.status).toBe(418);
    expect(stack.reached.count).toBe(1);
  });
});

describe('mountB2B — flag on', () => {
  it('serves /api/v1/health from the B2B router', async () => {
    const stack = existingStack();
    expect(mountB2B(stack.app, { env: ON, load: workingLoad })).toBe(true);
    addExistingRoutes(stack);
    server = await startServer(stack.app);

    const res = await server.get('/api/v1/health');
    expect(res.status).toBe(503); // answered by the B2B router (no database in this test)
    expect(res.body).toMatchObject({ status: 'down', database: 'down' });
    expect(stack.reached.count).toBe(0);
  });

  it('answers unknown /api/v1 paths itself (404) and never falls through to the existing app', async () => {
    const stack = existingStack();
    mountB2B(stack.app, { env: ON, load: workingLoad });
    addExistingRoutes(stack);
    server = await startServer(stack.app);

    const res = await server.get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(stack.reached.count).toBe(0);
  });

  it('leaves existing routes alone', async () => {
    const stack = existingStack();
    mountB2B(stack.app, { env: ON, load: workingLoad });
    addExistingRoutes(stack);
    server = await startServer(stack.app);

    const res = await server.get('/api/holidays');
    expect(res.status).toBe(418);
    expect(stack.reached.count).toBe(1);
  });
});

describe('mountB2B — crash isolation', () => {
  it('if the B2B code fails to load, /api/v1 returns 503 and the existing app keeps working', async () => {
    const stack = existingStack();
    const brokenLoad = async () => {
      throw new Error('simulated broken B2B module');
    };
    mountB2B(stack.app, { env: ON, load: brokenLoad });
    addExistingRoutes(stack);
    server = await startServer(stack.app);

    const b2b = await server.get('/api/v1/health');
    expect(b2b.status).toBe(503);

    const existing = await server.get('/api/app-home');
    expect(existing.status).toBe(418);
    expect(stack.reached.count).toBe(1);
  });
});
