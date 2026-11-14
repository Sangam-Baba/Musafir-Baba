// @ts-check
/**
 * Existing customer/admin logins on /api/v1, verified read-only. Uses an in-memory database with
 * records SHAPED like the existing app's `users` / `staffs` / `sessions` — never real data.
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createUserRepository } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createLegacyAuthenticator, firstMatch } from '../../src/b2b/routes/legacy-auth.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const EXISTING_SECRET = ['existing', 'app', 'access', 'secret', 'for-tests-only'].join('-');
const B2B_SECRET = ['b2b', 'legacy', 'test', 'secret', 'long-enough-for-hmac'].join('-');
const clock = { now: () => new Date() };
const CUSTOMER = '64b0000000000000000000c1';
const STAFF = '64b0000000000000000000a1';
const INACTIVE = '64b0000000000000000000c2';

/** Same payloads as the existing app's signAccessToken (auth.controller / staff.controller). */
const customerToken = (/** @type {Record<string, unknown>} */ extra = {}, secret = EXISTING_SECRET) =>
  jwt.sign({ sub: CUSTOMER, role: 'user', sessionId: 'sess-c1', name: 'Asha', ...extra }, secret, { expiresIn: '1d' });
const staffToken = () =>
  jwt.sign({ sub: STAFF, role: 'admin', permissions: ['all'], sessionId: 'sess-a1' }, EXISTING_SECRET, { expiresIn: '1d' });
/** @param {string | undefined} token */
const req = (token) =>
  /** @type {any} */ ({ get: (/** @type {string} */ h) => (h.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : undefined) });

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const authenticate = createLegacyAuthenticator({ secret: EXISTING_SECRET });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  const { ObjectId } = await import('mongodb');
  const oid = (/** @type {string} */ h) => new ObjectId(h);
  await mongo.db.collection('users').insertMany([
    { _id: oid(CUSTOMER), name: 'Asha', email: 'asha@x.in', role: 'user', isActive: true },
    { _id: oid(INACTIVE), name: 'Old', email: 'old@x.in', role: 'user', isActive: false },
  ]);
  await mongo.db
    .collection('staffs')
    .insertOne({ _id: oid(STAFF), name: 'Admin', email: 'admin@mb.in', role: 'admin', permissions: ['all'], isActive: true });
  await mongo.db.collection('sessions').insertMany([
    { sessionId: 'sess-c1', userId: oid(CUSTOMER), status: 'active' },
    { sessionId: 'sess-a1', userId: oid(STAFF), status: 'active' },
    { sessionId: 'sess-out', userId: oid(CUSTOMER), status: 'logout' },
    { sessionId: 'sess-forced', userId: oid(CUSTOMER), status: 'forced' },
    { sessionId: 'sess-inactive', userId: oid(INACTIVE), status: 'active' },
  ]);
});
afterAll(async () => mongo.stop());

describe('existing logins (read-only check)', () => {
  it('a website customer with an active session → customer', async () => {
    expect(await authenticate(req(customerToken()))).toEqual({ type: 'customer', customerId: CUSTOMER });
  });

  it('an admin with an active session → staff (no B2B permissions until platform roles, S01-T14)', async () => {
    expect(await authenticate(req(staffToken()))).toEqual({ type: 'staff', staffId: STAFF, permissions: [] });
  });

  it.each([
    ['no token', undefined],
    ['preview token ({ role } only, same secret)', jwt.sign({ role: 'admin' }, EXISTING_SECRET, { expiresIn: 600 })],
    ['logged-out session', customerToken({ sessionId: 'sess-out' })],
    ['force-closed session (stricter than the existing check)', customerToken({ sessionId: 'sess-forced' })],
    ["someone else's session", customerToken({ sessionId: 'sess-a1' })],
    ['unknown session', customerToken({ sessionId: 'nope' })],
    ['inactive customer', jwt.sign({ sub: INACTIVE, role: 'user', sessionId: 'sess-inactive' }, EXISTING_SECRET)],
    ['wrong secret', customerToken({}, 'some-other-secret-entirely-1234567890')],
    ['expired', jwt.sign({ sub: CUSTOMER, role: 'user', sessionId: 'sess-c1', exp: Math.floor(Date.now() / 1000) - 10 }, EXISTING_SECRET)],
    ['a B2B-style token signed with the existing secret', customerToken({ aud: 'b2b-api', typ: 'b2b' })],
    ['unknown role', customerToken({ role: 'partner' })],
    ['customer role on a staff id', jwt.sign({ sub: STAFF, role: 'user', sessionId: 'sess-a1' }, EXISTING_SECRET)],
    ['alg none', jwt.sign({ sub: CUSTOMER, role: 'user', sessionId: 'sess-c1' }, '', { algorithm: 'none' })],
  ])('refused: %s', async (_name, token) => {
    expect(await authenticate(req(token))).toBeNull();
  });

  it('nothing is written to the existing collections', async () => {
    const before = await mongo.db
      .collection('sessions')
      .find({}, { projection: { _id: 0 } })
      .toArray();
    await authenticate(req(customerToken()));
    await authenticate(req(staffToken()));
    expect(
      await mongo.db
        .collection('sessions')
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ).toEqual(before); // no lastSeen etc.
  });

  it('firstMatch tries business tokens first, then existing logins', async () => {
    const first = async () => /** @type {any} */ ({ type: 'user', userId: 'u', sessionId: 's' });
    expect(await firstMatch(first, authenticate)(req(customerToken()))).toMatchObject({ type: 'user' });
    expect(await firstMatch(async () => null, authenticate)(req(customerToken()))).toMatchObject({ type: 'customer' });
  });
});

describe('real router', () => {
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  beforeAll(async () => {
    const app = express();
    app.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger: createLogger({ write: () => {} }),
        env: { B2B_AUTH_SECRET: B2B_SECRET, JWT_ACCESS_SECRET: EXISTING_SECRET },
      }),
    );
    srv = await startServer(app);
  });
  afterAll(async () => srv.close());
  const auth = (/** @type {string} */ t) => ({ authorization: `Bearer ${t}` });

  it('existing logins are recognised (403 — not a business user), garbage is not (401)', async () => {
    expect((await srv.get('/api/v1/me', auth(customerToken()))).status).toBe(403);
    expect((await srv.get('/api/v1/members', auth(staffToken()))).status).toBe(403);
    expect((await srv.get('/api/v1/me', auth('garbage'))).status).toBe(401);
    expect((await srv.get('/api/v1/me', auth(jwt.sign({ role: 'admin' }, EXISTING_SECRET)))).status).toBe(401);
  });

  it('a suspended org is listed on /me with its reason and cannot be opened', async () => {
    const users = createUserRepository({ bcryptCost: 4, clock });
    const orgs = createOrganizationsService({ clock });
    const u = await users.create({ email: 'member@hotel.in', name: 'Member', password: 'correct-horse-battery' });
    const org = await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: u.id, createdBy: 's' });
    await OrganizationRecord.updateOne({ _id: org.id }, { $set: { status: 'SUSPENDED', statusReason: 'KYC documents expired' } });
    const token = (
      await srv.post('/api/v1/auth/login', { identifier: 'member@hotel.in', password: 'correct-horse-battery' }, { 'x-b2b-auth': '1' })
    ).body.accessToken;
    const me = (await srv.get('/api/v1/me', auth(token))).body;
    expect(me.currentOrgId).toBeNull();
    expect(me.memberships).toEqual([]);
    expect(me.blockedOrgs).toEqual([{ orgId: org.id, displayName: 'Sea View', status: 'SUSPENDED', reason: 'KYC documents expired' }]);
    expect((await srv.post('/api/v1/orgs/switch', { orgId: org.id }, auth(token))).status).toBe(404);
  });
});
