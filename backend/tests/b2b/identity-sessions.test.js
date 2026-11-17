// @ts-check
import express from 'express';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { verifyAccessToken } from '../../src/b2b/modules/identity/access-token.js';
import { buildRefreshToken, hashToken, parseRefreshToken } from '../../src/b2b/modules/identity/domain/tokens.js';
import { createSessionService, SessionRecord } from '../../src/b2b/modules/identity/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'auth', 'test', 'secret', 'long-enough-for-hmac-123'].join('-');
let now = new Date('2026-11-13T10:00:00Z');
const clock = { now: () => now };
const quiet = createLogger({ write: () => {} });
const SID = '64b0000000000000000000aa';

describe('refresh token format (pure)', () => {
  it('only tokens we issued parse; any change breaks the mac', () => {
    const t = buildRefreshToken(SID, 3, SECRET);
    expect(parseRefreshToken(t, SECRET)).toEqual({ sessionId: SID, generation: 3 });
    expect(parseRefreshToken(t, 'another-secret-that-is-also-long-enough!')).toBeNull();
    const [sid, , rand, mac] = t.split('.');
    expect(parseRefreshToken(`${sid}.2.${rand}.${mac}`, SECRET)).toBeNull(); // forged older generation
    expect(parseRefreshToken('garbage', SECRET)).toBeNull();
    expect(parseRefreshToken({ $ne: null }, SECRET)).toBeNull();
    expect(hashToken(t)).not.toContain(rand);
  });
});

describe('access tokens', () => {
  it('verify only our own tokens; existing-app tokens and expired ones are refused', () => {
    const svc = createSessionService({ secret: SECRET, clock });
    expect(svc).toBeTruthy();
    const ours = jwt.sign({ sub: 'u1', sid: SID, org: 'o1', typ: 'b2b' }, SECRET, {
      algorithm: 'HS256',
      audience: 'b2b-api',
      issuer: 'musafirbaba-b2b',
      expiresIn: 60,
    });
    expect(verifyAccessToken(ours, { secret: SECRET, clock: { now: () => new Date() } })).toEqual({
      userId: 'u1',
      sessionId: SID,
      orgId: 'o1',
    });
    // a token shaped like the existing app's (same claims, no audience/typ) is refused even with the right secret
    const existingStyle = jwt.sign({ sub: 'u1', role: 'user', sessionId: 's' }, SECRET, { expiresIn: 60 });
    expect(verifyAccessToken(existingStyle, { secret: SECRET, clock: { now: () => new Date() } })).toBeNull();
    expect(verifyAccessToken(ours, { secret: 'a-different-secret-of-sufficient-length!', clock: { now: () => new Date() } })).toBeNull();
    expect(verifyAccessToken(ours, { secret: SECRET, clock: { now: () => new Date(Date.now() + 120_000) } })).toBeNull();
    const none = jwt.sign({ sub: 'u1', sid: SID, typ: 'b2b' }, '', { algorithm: 'none', audience: 'b2b-api', issuer: 'musafirbaba-b2b' });
    expect(verifyAccessToken(none, { secret: SECRET, clock: { now: () => new Date() } })).toBeNull();
  });
});

describe('session service (id_sessions)', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  const sessions = createSessionService({ secret: SECRET, clock });

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());
  beforeEach(async () => {
    now = new Date('2026-11-13T10:00:00Z');
    await SessionRecord.deleteMany({}).setOptions({ tenantScope: 'SYSTEM', tenantReason: 'test cleanup' });
  });

  const login = () => sessions.create({ userId: 'u1', orgId: 'o1', methods: ['password'], ip: '1.2.3.4', userAgent: 'test' });

  it('create → access token for the user and session; refresh rotates the token', async () => {
    const first = await login();
    expect(verifyAccessToken(first.accessToken, { secret: SECRET, clock })).toEqual({
      userId: 'u1',
      sessionId: first.sessionId,
      orgId: 'o1',
    });
    expect(first.expiresIn).toBe(900);
    now = new Date('2026-11-13T10:05:00Z');
    const second = await sessions.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.sessionId).toBe(first.sessionId);
    const third = await sessions.refresh(second.refreshToken);
    expect(parseRefreshToken(third.refreshToken, SECRET)?.generation).toBe(3);
  });

  it('a stolen old token is detected: session revoked, event recorded in the same update', async () => {
    const first = await login();
    now = new Date('2026-11-13T10:05:00Z');
    const second = await sessions.refresh(first.refreshToken);
    now = new Date('2026-11-13T10:06:00Z'); // past the 10 s grace
    await expect(sessions.refresh(first.refreshToken)).rejects.toMatchObject({ code: 'REFRESH_REUSED', status: 401 });
    await expect(sessions.refresh(second.refreshToken)).rejects.toMatchObject({ code: 'SESSION_REVOKED' }); // the thief's copy and the user's both die
    const doc = await SessionRecord.findOne({ _id: first.sessionId, userId: 'u1' }).lean();
    expect(doc?.revokeReason).toBe('REFRESH_REUSED');
    expect(doc?.pendingEvents?.map((e) => e.type)).toEqual(['identity.session.created', 'identity.session.reused']); // sign-in, then theft
  });

  it('two tabs refreshing at once: one wins, the other gets REFRESH_IN_PROGRESS — no false theft alarm', async () => {
    const first = await login();
    const results = await Promise.allSettled([sessions.refresh(first.refreshToken), sessions.refresh(first.refreshToken)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = /** @type {PromiseRejectedResult} */ (results.find((r) => r.status === 'rejected'));
    expect(rejected.reason.code).toBe('REFRESH_IN_PROGRESS');
    // and a late retry with the old token inside the grace window is still not treated as theft
    await expect(sessions.refresh(first.refreshToken)).rejects.toMatchObject({ code: 'REFRESH_IN_PROGRESS' });
    expect((await SessionRecord.findOne({ _id: first.sessionId, userId: 'u1' }).lean())?.revokedAt).toBeNull();
  });

  it('expired sessions and forged tokens are refused', async () => {
    const first = await login();
    now = new Date('2026-12-14T10:00:00Z'); // > 30 days
    await expect(sessions.refresh(first.refreshToken)).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    await expect(sessions.refresh(buildRefreshToken(SID, 1, 'some-other-secret-long-enough-to-pass!!'))).rejects.toMatchObject({
      code: 'REFRESH_INVALID',
    });
    await expect(sessions.refresh(undefined)).rejects.toMatchObject({ code: 'REFRESH_INVALID' });
  });

  it('logout ends one session; logout-all ends every session of the user; findActive follows', async () => {
    const a = await login();
    const b = await login();
    const other = await sessions.create({ userId: 'u2', methods: ['password'] });
    expect(await sessions.findActive(a.sessionId, 'u1')).toMatchObject({ sessionId: a.sessionId, orgId: 'o1' });
    expect(await sessions.findActive(a.sessionId, 'u2')).toBeNull(); // wrong owner
    expect(await sessions.logout(a.refreshToken)).toEqual({ userId: 'u1', sessionId: a.sessionId });
    expect(await sessions.findActive(a.sessionId, 'u1')).toBeNull();
    expect(await sessions.logout('nonsense')).toBeNull();
    expect(await sessions.logoutAll(b.refreshToken)).toBe(1);
    expect(await sessions.findActive(b.sessionId, 'u1')).toBeNull();
    expect(await sessions.findActive(other.sessionId, 'u2')).not.toBeNull();
    expect(await sessions.revokeAll('u2', 'ORG_SUSPENDED')).toBe(1);
  });

  it('without B2B_AUTH_SECRET business login is unavailable (503), not insecure', async () => {
    const off = createSessionService({ secret: undefined, clock });
    await expect(off.create({ userId: 'u1', methods: ['password'] })).rejects.toMatchObject({
      code: 'BUSINESS_LOGIN_NOT_CONFIGURED',
      status: 503,
    });
    const short = createSessionService({ secret: 'too-short', clock });
    await expect(short.refresh('x')).rejects.toMatchObject({ status: 503 });
  });

  describe('HTTP: /api/v1/auth/refresh, /logout, /logout-all', () => {
    /** @type {Awaited<ReturnType<typeof startServer>>} */
    let srv;
    beforeAll(async () => {
      const app = express();
      app.use(
        '/api/v1',
        createB2BRouter({ connect: false, logger: quiet, clock, env: { B2B_AUTH_SECRET: SECRET, NODE_ENV: 'production' } }),
      );
      srv = await startServer(app);
    });
    afterAll(async () => srv.close());

    /** @param {string} token */
    const cookie = (token) => ({ cookie: `other=1; b2b_refresh=${encodeURIComponent(token)}`, 'x-b2b-auth': '1' });

    it('refresh: new access token in the body, rotated refresh token in a strict HttpOnly cookie', async () => {
      const first = await login();
      const res = await srv.post('/api/v1/auth/refresh', {}, cookie(first.refreshToken));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
      expect(verifyAccessToken(res.body.accessToken, { secret: SECRET, clock })?.userId).toBe('u1');
      const set = res.headers.get('set-cookie') ?? '';
      expect(set).toMatch(/^b2b_refresh=/);
      expect(set).toContain('Path=/api/v1/auth');
      expect(set).toContain('HttpOnly');
      expect(set).toContain('SameSite=None'); // production: website and API are on different domains
      expect(set).toContain('Secure');
      expect(JSON.stringify(res.body)).not.toContain(first.refreshToken.split('.')[2]);
    });

    it('refuses without the X-B2B-Auth header (CSRF) and clears the cookie on a bad token', async () => {
      const first = await login();
      expect((await srv.post('/api/v1/auth/refresh', {}, { cookie: `b2b_refresh=${first.refreshToken}` })).status).toBe(401);
      const bad = await srv.post('/api/v1/auth/refresh', {}, cookie('nope'));
      expect(bad.status).toBe(401);
      expect(bad.body.code).toBe('REFRESH_INVALID');
      expect(bad.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
    });

    it('logout → 204 and cookie cleared; logout-all reports how many sessions ended', async () => {
      const a = await login();
      await login();
      const out = await srv.post('/api/v1/auth/logout', {}, cookie(a.refreshToken));
      expect(out.status).toBe(204);
      expect(out.headers.get('set-cookie')).toContain('b2b_refresh=;');
      const b = await login();
      const all = await srv.post('/api/v1/auth/logout-all', {}, cookie(b.refreshToken));
      expect(all.body).toEqual({ sessionsEnded: 2 });
    });
  });
});
