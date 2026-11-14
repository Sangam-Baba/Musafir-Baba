// @ts-check
/** The real existing app with B2B switched off: /api/v1 is not served by B2B code (behaviour as today). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from './helpers/http.js';

/** @type {Awaited<ReturnType<typeof startServer>>} */
let server;
beforeAll(async () => {
  // set explicitly: a developer's .env may switch B2B on, and dotenv never overrides a value already set
  process.env.B2B_ENABLED = 'false';
  const { default: app } = await import('../../src/app.js');
  server = await startServer(app);
});
afterAll(async () => server.close());

describe('real app.js — B2B flag off', () => {
  it('does not serve /api/v1 (the existing app answers as it does today)', async () => {
    const res = await server.get('/api/v1/health');
    expect(res.status).toBe(404);
    expect(typeof res.body).toBe('string'); // Express default "Cannot GET" page from the existing stack
  });
});
