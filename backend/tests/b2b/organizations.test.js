// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { parseReference } from '../../src/b2b/core/ids.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { BranchRecord } from '../../src/b2b/modules/organizations/models/branch.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'orgs', 'test', 'secret', 'long-enough-for-hmac-123'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-14T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  const app = express();
  app.use(
    '/api/v1',
    createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: SECRET } }),
  );
  srv = await startServer(app);
});
afterAll(async () => {
  await srv.close();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    UserRecord.deleteMany({}),
    SessionRecord.deleteMany({}).setOptions(SYSTEM),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    BranchRecord.deleteMany({}).setOptions(SYSTEM),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} email */
const newUser = async (email) => (await users.create({ email, name: email.split('@')[0] ?? 'x', password: PASSWORD })).id;
/** @param {string} email */
const login = async (email) => (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;
/** @param {string} token */
const auth = (token) => ({ authorization: `Bearer ${token}` });

describe('organizations service', () => {
  it('creates a client org with a checked reference, its owner membership and both events', async () => {
    const owner = await newUser('owner@acme.in');
    const { id, reference } = await orgs.createOrganization({
      type: 'CLIENT',
      legalName: ' Acme Travels Pvt Ltd ',
      displayName: 'Acme',
      ownerUserId: owner,
      createdBy: 'staff:1',
    });
    expect(reference).toMatch(/^MBC-[0-9A-Z]{6}$/);
    expect(parseReference(reference)).toBe(reference);
    const org = await OrganizationRecord.findOne({ _id: id }).lean();
    expect(org).toMatchObject({ type: 'CLIENT', legalName: 'Acme Travels Pvt Ltd', status: 'ONBOARDING' });
    expect(org?.pendingEvents?.map((e) => e.type)).toEqual(['organizations.org.created']);
    const m = await MemberRecord.findOne({ orgId: id, userId: owner }).lean();
    expect(m).toMatchObject({ roles: ['client.owner'], status: 'ACTIVE' });
    expect(m?.pendingEvents?.map((e) => e.type)).toEqual(['organizations.member.joined']);
    const hotel = await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View Hotels', createdBy: 'staff:1' });
    expect(hotel.reference).toMatch(/^MBHO-/);
  });

  it('addMember is repeat-safe; memberships skip suspended orgs; default org only when there is exactly one', async () => {
    const u = await newUser('u@x.in');
    const a = await orgs.createOrganization({ type: 'CLIENT', legalName: 'A', ownerUserId: u, createdBy: 's' });
    await orgs.addMember({ orgId: a.id, userId: u, roles: ['client.viewer'], addedBy: 's' });
    expect(await MemberRecord.countDocuments({ orgId: a.id })).toBe(1);
    expect((await MemberRecord.findOne({ orgId: a.id, userId: u }).lean())?.roles).toEqual(['client.owner']); // unchanged
    expect(await orgs.defaultOrgFor(u)).toBe(a.id);
    const b = await orgs.createOrganization({ type: 'HOTEL', legalName: 'B', ownerUserId: u, createdBy: 's' });
    expect(await orgs.defaultOrgFor(u)).toBeNull();
    expect((await orgs.membershipsOf(u)).map((m) => m.orgId)).toEqual([a.id, b.id]);
    await OrganizationRecord.updateOne({ _id: b.id }, { $set: { status: 'SUSPENDED' } });
    expect((await orgs.membershipsOf(u)).map((m) => m.orgId)).toEqual([a.id]);
    expect(await orgs.usableMembership(b.id, u)).toBeNull();
    expect(await orgs.usableMembership(a.id, u)).toMatchObject({ orgType: 'CLIENT', roles: ['client.owner'] });
    expect(await orgs.usableMembership('not-an-id', u)).toBeNull();
  });
});

describe('HTTP: /me, /orgs/switch, /members, /branches', () => {
  it('a user in one org lands in it at sign-in; the owner manages branches', async () => {
    const owner = await newUser('owner@acme.in');
    const acme = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: owner, createdBy: 's' });
    const token = await login('owner@acme.in');
    const me = await srv.get('/api/v1/me', auth(token));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ currentOrgId: acme.id, user: { email: 'owner@acme.in' }, mfa: { totp: 'off' } });
    expect(me.body.memberships).toEqual([expect.objectContaining({ orgId: acme.id, type: 'CLIENT', roles: ['client.owner'] })]);

    const created = await srv.post('/api/v1/branches', { name: 'Delhi HQ', city: 'Delhi', stateCode: '07' }, auth(token));
    expect(created.status).toBe(201);
    expect((await srv.get('/api/v1/branches', auth(token))).body.data).toEqual([
      expect.objectContaining({ name: 'Delhi HQ', status: 'ACTIVE' }),
    ]);
    expect((await srv.patch(`/api/v1/branches/${created.body.id}`, { status: 'CLOSED' }, auth(token))).body.status).toBe('CLOSED');
    expect((await srv.get('/api/v1/members', auth(token))).body.data).toEqual([
      expect.objectContaining({ userId: owner, roles: ['client.owner'] }),
    ]);
    // the org comes from the session — a body orgId is refused, not used
    expect((await srv.post('/api/v1/branches', { name: 'Sneaky', orgId: '64b000000000000000000000' }, auth(token))).status).toBe(400);
  });

  it("another org's branch looks missing (404); a booking agent can read branches but not change them", async () => {
    const a = await newUser('a@acme.in');
    const b = await newUser('b@other.in');
    const agent = await newUser('agent@acme.in');
    const acme = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: a, createdBy: 's' });
    await orgs.createOrganization({ type: 'CLIENT', legalName: 'Other', ownerUserId: b, createdBy: 's' });
    await orgs.addMember({ orgId: acme.id, userId: agent, roles: ['client.bookingAgent'], addedBy: 's' });
    const otherBranch = await srv.post('/api/v1/branches', { name: 'Other HQ' }, auth(await login('b@other.in')));
    const ta = await login('a@acme.in');
    expect((await srv.patch(`/api/v1/branches/${otherBranch.body.id}`, { name: 'Mine now' }, auth(ta))).status).toBe(404);
    const tAgent = await login('agent@acme.in');
    expect((await srv.get('/api/v1/branches', auth(tAgent))).status).toBe(200);
    expect((await srv.post('/api/v1/branches', { name: 'X' }, auth(tAgent))).status).toBe(403);
    expect((await srv.get('/api/v1/members', auth(tAgent))).status).toBe(403);
  });

  it('hotels have no branches (the permission is client-only)', async () => {
    const h = await newUser('h@hotel.in');
    await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: h, createdBy: 's' });
    expect((await srv.post('/api/v1/branches', { name: 'X' }, auth(await login('h@hotel.in')))).status).toBe(403);
  });

  it('a user in two orgs picks one with the switcher; non-members get 404; suspension takes effect at once', async () => {
    const u = await newUser('both@x.in');
    const outsider = await newUser('out@x.in');
    const client = await orgs.createOrganization({ type: 'CLIENT', legalName: 'C', ownerUserId: u, createdBy: 's' });
    const hotel = await orgs.createOrganization({ type: 'HOTEL', legalName: 'H', ownerUserId: u, createdBy: 's' });
    const notMine = await orgs.createOrganization({ type: 'CLIENT', legalName: 'N', ownerUserId: outsider, createdBy: 's' });
    const token = await login('both@x.in');
    expect((await srv.get('/api/v1/me', auth(token))).body.currentOrgId).toBeNull();
    expect((await srv.get('/api/v1/members', auth(token))).status).toBe(403); // no org open yet

    const switched = await srv.post('/api/v1/orgs/switch', { orgId: client.id }, auth(token));
    expect(switched.body).toMatchObject({ orgId: client.id, tokenType: 'Bearer' });
    const t2 = switched.body.accessToken;
    expect((await srv.get('/api/v1/members', auth(t2))).status).toBe(200);
    expect((await srv.get('/api/v1/me', auth(t2))).body.currentOrgId).toBe(client.id);
    expect((await srv.post('/api/v1/orgs/switch', { orgId: notMine.id }, auth(t2))).status).toBe(404);

    const toHotel = await srv.post('/api/v1/orgs/switch', { orgId: hotel.id }, auth(t2));
    await OrganizationRecord.updateOne({ _id: hotel.id }, { $set: { status: 'SUSPENDED' } });
    expect((await srv.get('/api/v1/members', auth(toHotel.body.accessToken))).status).toBe(403);
    expect((await srv.post('/api/v1/orgs/switch', { orgId: hotel.id }, auth(t2))).status).toBe(404);
  });

  it('anonymous callers still reach public endpoints (no blanket sign-in check)', async () => {
    expect((await srv.get('/api/v1/meta/version')).status).toBe(200);
    expect((await srv.get('/api/v1/me')).status).toBe(401);
    expect((await srv.get('/api/v1/branches')).status).toBe(401);
  });
});
