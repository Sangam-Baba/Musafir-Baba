// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createCache } from '../../src/b2b/core/cache.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { problemHandler } from '../../src/b2b/core/http/problem.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { clientIp, createRateLimiter, RATE_LIMITS_COLLECTION, rateLimit, trustLoginRelay } from '../../src/b2b/core/rate-limit.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let nowMs = Date.parse('2026-11-12T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const advance = (/** @type {number} */ ms) => {
  nowMs += ms;
};

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({});
});

describe('rate limiter (MongoDB)', () => {
  it('allows up to the limit, then refuses until the window ends', async () => {
    const login = createRateLimiter({ name: 'login', points: 3, windowMs: 60_000, clock });
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push((await login.consume('ip:1.2.3.4')).allowed);
    expect(results).toEqual([true, true, true, false, false]);
    expect((await login.consume('ip:5.6.7.8')).allowed).toBe(true); // other callers unaffected
    advance(60_000);
    expect((await login.consume('ip:1.2.3.4')).allowed).toBe(true);
  });

  it('counts correctly across processes (two limiters sharing the database, 20 parallel calls)', async () => {
    const a = createRateLimiter({ name: 'otp', points: 10, windowMs: 60_000, clock });
    const b = createRateLimiter({ name: 'otp', points: 10, windowMs: 60_000, clock });
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).consume('user:1')));
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
  });

  it('blocked callers cause no more database writes', async () => {
    const lim = createRateLimiter({ name: 'search', points: 1, windowMs: 60_000, clock });
    await lim.consume('k');
    await lim.consume('k'); // over → remembered in memory
    for (let i = 0; i < 5; i += 1) await lim.consume('k');
    const doc = await mongo.db.collection(RATE_LIMITS_COLLECTION).findOne({});
    expect(doc?.count).toBe(2);
  });

  it('returns 429 with Retry-After and RateLimit headers through the middleware', async () => {
    const lim = createRateLimiter({ name: 'booking', points: 1, windowMs: 60_000, clock });
    const app = express();
    app.get(
      '/x',
      rateLimit(lim, (req) => `ip:${clientIp(req)}`),
      (_req, res) => res.json({ ok: true }),
    );
    app.use(problemHandler(createLogger({ write: () => {} })));
    const server = await startServer(app);
    try {
      expect((await server.get('/x')).status).toBe(200);
      const res = await server.get('/x');
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('RATE_LIMITED');
      expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
      expect(res.headers.get('ratelimit-remaining')).toBe('0');
    } finally {
      await server.close();
    }
  });

  it('refuses badly named limits', () => {
    expect(() => createRateLimiter({ name: 'Bad Name', points: 1, windowMs: 1000, clock })).toThrow(/kebab-case/);
  });
});

describe('in-process cache', () => {
  it('expires entries, evicts the least recently used, clears by prefix', () => {
    const cache = createCache({ max: 2, ttlMs: 1000, clock });
    cache.set('property:1:a', 1);
    cache.set('property:1:b', 2);
    cache.get('property:1:a'); // a is now most recent
    cache.set('property:2:a', 3); // evicts b
    expect(cache.get('property:1:b')).toBeUndefined();
    expect(cache.get('property:1:a')).toBe(1);
    cache.deletePrefix('property:1:');
    expect(cache.get('property:1:a')).toBeUndefined();
    expect(cache.get('property:2:a')).toBe(3);
    advance(1000);
    expect(cache.get('property:2:a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});

describe('clientIp', () => {
  /** @param {Record<string, string>} headers @param {string} [remote] */
  const req = (headers, remote = '10.0.0.5') =>
    /** @type {any} */ ({ get: (/** @type {string} */ h) => headers[h.toLowerCase()], socket: { remoteAddress: remote } });

  it('uses a well-formed CF-Connecting-IP, otherwise the socket address', () => {
    expect(clientIp(req({ 'cf-connecting-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIp(req({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(clientIp(req({ 'cf-connecting-ip': '1.2.3.4, 5.6.7.8' }))).toBe('10.0.0.5'); // malformed → ignored
    expect(clientIp(req({}))).toBe('10.0.0.5');
  });

  it("the login relay on musafirbaba.com: its visitor IP is used only with the shared secret (anyone else can't fake it)", () => {
    const secret = 'relay-secret-'.padEnd(40, 'x');
    const relayed = { 'cf-connecting-ip': '76.76.21.9', 'x-b2b-client-ip': '203.0.113.50' };
    trustLoginRelay(secret);
    try {
      expect(clientIp(req({ ...relayed, 'x-b2b-relay-key': secret }))).toBe('203.0.113.50');
      expect(clientIp(req({ ...relayed, 'x-b2b-relay-key': `${secret}-wrong` }))).toBe('76.76.21.9');
      expect(clientIp(req({ ...relayed }))).toBe('76.76.21.9');
      expect(clientIp(req({ 'x-b2b-relay-key': secret, 'x-b2b-client-ip': '1.2.3.4, 5.6.7.8' }))).toBe('10.0.0.5'); // malformed → ignored
    } finally {
      trustLoginRelay(undefined);
    }
    expect(clientIp(req({ ...relayed, 'x-b2b-relay-key': secret }))).toBe('76.76.21.9'); // no secret configured → never trusted
    trustLoginRelay('short');
    expect(clientIp(req({ ...relayed, 'x-b2b-relay-key': 'short' }))).toBe('76.76.21.9'); // a weak secret is ignored
    trustLoginRelay(undefined);
  });
});
