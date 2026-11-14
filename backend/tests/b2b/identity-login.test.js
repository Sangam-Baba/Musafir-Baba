// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createRateLimiter, RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { verifyAccessToken } from '../../src/b2b/modules/identity/access-token.js';
import {
  createLoginService,
  createSessionService,
  createUserRepository,
  failureDelayMs,
  SessionRecord,
  UserRecord,
} from '../../src/b2b/modules/identity/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'login', 'test', 'secret', 'long-enough-for-hmac-1'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-13T10:00:00Z');
const clock = { now: () => now };
const quiet = createLogger({ write: () => {} });
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test cleanup' };

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const users = createUserRepository({ bcryptCost: 4, clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  now = new Date('2026-11-13T10:00:00Z');
  await Promise.all([
    UserRecord.deleteMany({}),
    SessionRecord.deleteMany({}).setOptions(SYSTEM),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
  await users.create({ email: 'asha@example.com', phone: '9876543210', name: 'Asha', password: PASSWORD });
});

/** @param {{ perIp?: number, perAccount?: number }} [limits] */
function makeLogin(limits = {}) {
  /** @type {number[]} */
  const delays = [];
  const window = { windowMs: 15 * 60_000, clock };
  const login = createLoginService({
    users,
    sessions: createSessionService({ secret: SECRET, clock }),
    limiters: {
      ip: createRateLimiter({ name: `t-ip-${Math.random().toString(36).slice(2, 8)}`, points: limits.perIp ?? 20, ...window }),
      account: createRateLimiter({ name: `t-acct-${Math.random().toString(36).slice(2, 8)}`, points: limits.perAccount ?? 10, ...window }),
      failures: createRateLimiter({ name: `t-fail-${Math.random().toString(36).slice(2, 8)}`, points: 1000, ...window }),
    },
    clock,
    sleep: async (ms) => {
      delays.push(ms);
    },
  });
  return { login, delays };
}

describe('failure delay', () => {
  it('none for 3 failures, then doubling from 250 ms, capped at 3 s', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map(failureDelayMs)).toEqual([0, 0, 0, 250, 500, 1000, 2000, 3000, 3000]);
  });
});

describe('login service', () => {
  it('right password → session for the user (by email or phone)', async () => {
    const { login } = makeLogin();
    /** @typedef {import('../../src/b2b/modules/identity/sessions.service.js').IssuedTokens} Tokens */
    const byEmail = /** @type {Tokens} */ (await login.login({ identifier: 'ASHA@example.com', password: PASSWORD, ip: '1.1.1.1' }));
    const byPhone = /** @type {Tokens} */ (await login.login({ identifier: '+91 98765 43210', password: PASSWORD, ip: '1.1.1.1' }));
    const claims = verifyAccessToken(byEmail.accessToken, { secret: SECRET, clock });
    expect(claims?.userId).toBe(verifyAccessToken(byPhone.accessToken, { secret: SECRET, clock })?.userId);
    expect((await SessionRecord.findOne({ _id: byEmail.sessionId, userId: claims?.userId }).lean())?.methods).toEqual(['password']);
  });

  it('wrong password and unknown account give the same answer', async () => {
    const { login } = makeLogin();
    const wrong = await login.login({ identifier: 'asha@example.com', password: 'nope-nope-nope', ip: '1.1.1.1' }).catch((e) => e);
    const unknown = await login.login({ identifier: 'ghost@example.com', password: 'nope-nope-nope', ip: '1.1.1.1' }).catch((e) => e);
    expect([wrong.code, wrong.status]).toEqual(['LOGIN_FAILED', 401]);
    expect([unknown.code, unknown.status]).toEqual(['LOGIN_FAILED', 401]);
  });

  it('5 wrong passwords lock the account (423 + retry time) and record identity.user.locked', async () => {
    const { login, delays } = makeLogin();
    for (let i = 0; i < 4; i += 1)
      await expect(login.login({ identifier: 'asha@example.com', password: 'wrong-password', ip: '1.1.1.1' })).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
      });
    const locked = await login.login({ identifier: 'asha@example.com', password: 'wrong-password', ip: '1.1.1.1' }).catch((e) => e);
    expect(locked).toMatchObject({ code: 'ACCOUNT_LOCKED', status: 423, details: { retryAfterSeconds: 900 } });
    await expect(login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
    expect(delays).toEqual([0, 0, 0, 250, 500, 1000]); // growing delay per IP
    const doc = await UserRecord.findOne({ email: 'asha@example.com' }).lean();
    expect(doc?.pendingEvents?.map((e) => [e.type, e.payload.failedLogins])).toEqual([['identity.user.locked', 5]]);
  });

  it('per-account limit stops attempts spread over many IPs', async () => {
    const { login } = makeLogin({ perAccount: 3 });
    for (let i = 0; i < 3; i += 1)
      await expect(login.login({ identifier: 'asha@example.com', password: 'wrong-password', ip: `10.0.0.${i}` })).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
      });
    await expect(login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '10.0.0.99' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    });
    now = new Date('2026-11-13T10:15:00Z'); // next window
    await expect(login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '10.0.0.99' })).resolves.toMatchObject({
      expiresIn: 900,
    });
  });

  it('per-IP limit stops one machine trying many accounts', async () => {
    const { login } = makeLogin({ perIp: 4 });
    for (let i = 0; i < 4; i += 1)
      await expect(login.login({ identifier: `user${i}@example.com`, password: 'x-x-x-x-x-x', ip: '6.6.6.6' })).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
      });
    await expect(login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '6.6.6.6' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    await expect(login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '7.7.7.7' })).resolves.toBeTruthy();
  });

  it('rate-limit keys never contain the email or phone', async () => {
    const { login } = makeLogin();
    await login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '1.1.1.1' });
    const ids = (await mongo.db.collection(RATE_LIMITS_COLLECTION).find({}).toArray()).map((d) => String(d._id));
    expect(ids.join(' ')).not.toMatch(/asha|9876543210/);
  });

  it('a disabled account is refused (403) only with the right password', async () => {
    await UserRecord.updateOne({ email: 'asha@example.com' }, { $set: { status: 'DISABLED' } });
    const { login } = makeLogin();
    await expect(login.login({ identifier: 'asha@example.com', password: 'wrong-password', ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'LOGIN_FAILED',
    });
    await expect(login.login({ identifier: 'asha@example.com', password: PASSWORD, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'ACCOUNT_DISABLED',
      status: 403,
    });
  });
});

describe('POST /api/v1/auth/login (real router)', () => {
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  beforeAll(async () => {
    const app = express();
    app.use('/api/v1', createB2BRouter({ connect: false, logger: quiet, clock, env: { B2B_AUTH_SECRET: SECRET } }));
    srv = await startServer(app);
  });
  afterAll(async () => srv.close());
  const H = { 'x-b2b-auth': '1' };

  it('logs in: access token in the body, refresh token only in the HttpOnly cookie', async () => {
    const res = await srv.post('/api/v1/auth/login', { identifier: 'asha@example.com', password: PASSWORD }, H);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['accessToken', 'expiresIn', 'tokenType']);
    expect(res.headers.get('set-cookie')).toMatch(/^b2b_refresh=.+HttpOnly; SameSite=Lax$/); // local; production: SameSite=None; Secure;
  });

  it('refuses NoSQL injection shapes, extra keys and missing header before touching the database', async () => {
    const bad = [
      { identifier: { $gt: '' }, password: PASSWORD },
      { identifier: 'asha@example.com', password: { $ne: null } },
      { identifier: 'asha@example.com', password: PASSWORD, role: 'owner' },
      { 'identifier.$where': '1', password: PASSWORD },
    ];
    for (const body of bad) expect((await srv.post('/api/v1/auth/login', body, H)).status).toBe(400);
    expect((await srv.post('/api/v1/auth/login', { identifier: 'asha@example.com', password: PASSWORD })).status).toBe(401);
  });

  it('wrong password → 401 LOGIN_FAILED in the standard error format', async () => {
    const res = await srv.post('/api/v1/auth/login', { identifier: 'asha@example.com', password: 'wrong-password' }, H);
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect(res.body).toMatchObject({ code: 'LOGIN_FAILED', status: 401 });
  });
});
