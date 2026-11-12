// @ts-check
/**
 * The real existing app with B2B_ENABLED=true but the B2B code unable to start
 * (invalid B2B config → start-up error, before any DB connection): /api/v1 returns 503,
 * existing routes still work.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from './helpers/http.js';

/** @type {Awaited<ReturnType<typeof startServer>>} */
let server;
beforeAll(async () => {
  process.env.B2B_ENABLED = 'true';
  process.env.B2B_REALTIME_PORT = 'not-a-port'; // dotenv never overrides variables that are already set
  const { default: app } = await import('../../src/app.js');
  server = await startServer(app);
});
afterAll(async () => server.close());

describe('real app.js — B2B code fails to start', () => {
  it('answers 503 on /api/v1', async () => {
    const res = await server.get('/api/v1/health');
    expect(res.status).toBe(503);
  });

  it('existing routes keep being handled by the existing app', async () => {
    const res = await server.get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(typeof res.body).toBe('string'); // existing stack's default 404, not the B2B one
  });
});
