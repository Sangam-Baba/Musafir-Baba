// @ts-check
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { contextMiddleware, contextOf } from '../../src/b2b/core/http/context-middleware.js';
import { publicRoute, requireCustomer, requirePermission } from '../../src/b2b/core/http/permissions.js';
import { notFoundHandler, problemHandler } from '../../src/b2b/core/http/problem.js';
import { readIdempotencyKey, requestTimeout, securityHeaders } from '../../src/b2b/core/http/protection.js';
import { requestId } from '../../src/b2b/core/http/request-id.js';
import { findForbiddenKey, validate } from '../../src/b2b/core/http/validate.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';

const quiet = createLogger({ write: () => {} });

/** @param {import('../../src/b2b/core/context.js').Actor | null} actor */
function testApp(actor) {
  const app = express();
  const r = express.Router();
  r.use(securityHeaders(), requestTimeout(200), requestId, express.json({ limit: '1kb' }));
  r.use(contextMiddleware({ channel: 'WEBSITE', logger: quiet, authenticate: async () => actor }));
  const LoginBody = z.strictObject({ email: z.string().email().max(200), password: z.string().min(1).max(200) });
  r.post('/login', publicRoute(), validate({ body: LoginBody }), (_req, res) => res.json({ got: res.locals.input.body }));
  r.get('/me/bookings', requireCustomer(), (_req, res) => res.json({ actor: contextOf(res).actor.type }));
  r.get('/admin/hotels', requirePermission('hotel.property.approve'), (_req, res) => res.json({ ok: true }));
  r.post('/orders', publicRoute(), (req, res) => res.json({ key: readIdempotencyKey(req) }));
  r.get('/slow', publicRoute(), () => {}); // never answers
  r.use(notFoundHandler(), problemHandler(quiet));
  app.use('/api/v1', r);
  return app;
}

/** @type {Awaited<ReturnType<typeof startServer>> | undefined} */
let server;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('NoSQL-injection shapes are refused before validation', () => {
  it.each([
    [{ email: { $ne: null }, password: 'x' }, 'body.email.$ne'],
    [{ email: 'a@b.co', password: { $gt: '' } }, 'body.password.$gt'],
    [{ 'a.b': 1 }, 'body.a.b'],
    [JSON.parse('{"__proto__": {"admin": true}}'), 'body.__proto__'],
    [{ email: 'a@b.co', password: 'x', nested: [{ $where: 'sleep(1000)' }] }, 'body.nested.0.$where'],
  ])('payload %j', async (payload, path) => {
    server = await startServer(testApp(null));
    const res = await server.post('/api/v1/login', payload);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors[0]).toMatchObject({ path, code: 'forbidden_key' });
  });

  it('finds forbidden keys at any depth but allows normal data', () => {
    expect(findForbiddenKey({ a: { b: { c: [{ ok: 1 }] } } })).toBeNull();
    expect(findForbiddenKey({ a: { b: { c: [{ $or: [] }] } } })).toBe('a.b.c.0.$or');
    expect(findForbiddenKey('$ne')).toBeNull(); // values are fine; only keys matter
  });
});

describe('validate()', () => {
  it('passes parsed input to the handler', async () => {
    server = await startServer(testApp(null));
    const res = await server.post('/api/v1/login', { email: 'a@b.co', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body.got).toEqual({ email: 'a@b.co', password: 'pw' });
  });

  it('refuses unknown keys (strict) and reports field errors', async () => {
    server = await startServer(testApp(null));
    const res = await server.post('/api/v1/login', { email: 'not-an-email', password: 'pw', role: 'admin' });
    expect(res.status).toBe(400);
    const paths = res.body.errors.map((/** @type {{ path: string }} */ e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(['body.email', 'body']));
  });

  it('maps invalid JSON and oversized bodies to stable codes', async () => {
    server = await startServer(testApp(null));
    expect((await server.post('/api/v1/login', '{"email":')).body.code).toBe('INVALID_JSON');
    expect((await server.post('/api/v1/login', { email: 'x'.repeat(2000) })).status).toBe(413);
  });
});

describe('permissions', () => {
  it('anonymous → 401, wrong actor → 403, right actor → 200', async () => {
    server = await startServer(testApp(null));
    expect((await server.get('/api/v1/me/bookings')).status).toBe(401);
    expect((await server.get('/api/v1/admin/hotels')).status).toBe(401);
    await server.close();

    server = await startServer(testApp({ type: 'customer', customerId: 'c1' }));
    expect((await server.get('/api/v1/me/bookings')).body).toEqual({ actor: 'customer' });
    expect((await server.get('/api/v1/admin/hotels')).body.code).toBe('PERMISSION_DENIED');
    await server.close();

    server = await startServer(testApp({ type: 'staff', staffId: 's1', permissions: ['hotel.property.approve'] }));
    expect((await server.get('/api/v1/admin/hotels')).status).toBe(200);
    expect((await server.get('/api/v1/me/bookings')).status).toBe(403);
  });
});

describe('protections', () => {
  it('sets API security headers and hides X-Powered-By', async () => {
    server = await startServer(testApp(null));
    const res = await server.get('/api/v1/me/bookings');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('times out slow requests with 503 REQUEST_TIMEOUT', async () => {
    server = await startServer(testApp(null));
    const res = await server.get('/api/v1/slow');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('REQUEST_TIMEOUT');
  });

  it('requires a UUID Idempotency-Key', async () => {
    server = await startServer(testApp(null));
    expect((await server.post('/api/v1/orders', {})).body.code).toBe('VALIDATION_FAILED');
    expect((await server.post('/api/v1/orders', {}, { 'Idempotency-Key': 'abc' })).status).toBe(400);
    const key = '3f2b8c1e-9d4a-4f6b-8a2c-1e5d7f9b0a3c';
    expect((await server.post('/api/v1/orders', {}, { 'Idempotency-Key': key.toUpperCase() })).body).toEqual({ key });
  });
});

describe('the real /api/v1 router', () => {
  it('serves health with security headers and an anonymous context', async () => {
    const app = express();
    app.use('/api/v1', createB2BRouter({ connect: false, logger: quiet }));
    server = await startServer(app);
    const res = await server.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
