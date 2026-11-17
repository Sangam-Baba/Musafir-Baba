// @ts-check
/**
 * MusafirBaba admin access (S01-T14). Uses an in-memory database with `staffs` / `sessions`
 * records SHAPED like the existing app's — never real data.
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { EMAIL_JOB } from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { StaffRoleRecord } from '../../src/b2b/modules/access/index.js';
import { hotp, stepAt } from '../../src/b2b/modules/identity/domain/totp.js';
import { createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { MfaRecord } from '../../src/b2b/modules/identity/models/mfa.model.js';
import {
  createOrganizationsService,
  InvitationRecord,
  MemberRecord,
  OrganizationRecord,
} from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createStaffRoles } from '../../src/b2b/routes/admin-wiring.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const EXISTING_SECRET = ['existing', 'admin', 'secret', 'for-tests-only', '42'].join('-');
const B2B_SECRET = ['b2b', 'admin', 'test', 'secret', 'long-enough-for-hmac'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-14T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const STAFF = {
  ops: '64b0000000000000000000a1',
  support: '64b0000000000000000000a2',
  plain: '64b0000000000000000000a3',
  super1: '64b0000000000000000000a4',
  super2: '64b0000000000000000000a5',
  super3: '64b0000000000000000000a6',
};
/** existing-app style admin token (staff.controller payload) @param {string} id */
const existingToken = (id) =>
  jwt.sign({ sub: id, role: 'admin', permissions: [], sessionId: `sess-${id}` }, EXISTING_SECRET, { expiresIn: '1d' });
/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
const staffRoles = createStaffRoles(clock);
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  for (const [name, id] of Object.entries(STAFF)) {
    await mongo.db
      .collection('staffs')
      .insertOne({ _id: new ObjectId(id), name, email: `${name}@musafirbaba.com`, role: 'admin', isActive: true });
  }
  const app = express();
  app.use(
    '/api/v1',
    createB2BRouter({
      connect: false,
      logger: createLogger({ write: () => {} }),
      clock,
      env: { B2B_AUTH_SECRET: B2B_SECRET, JWT_ACCESS_SECRET: EXISTING_SECRET },
    }),
  );
  srv = await startServer(app);
});
afterAll(async () => {
  await srv.close();
  await mongo.stop();
});
beforeEach(async () => {
  now = new Date('2026-11-14T10:00:00Z');
  await mongo.db.collection('sessions').deleteMany({});
  await mongo.db
    .collection('sessions')
    .insertMany(Object.values(STAFF).map((id) => ({ sessionId: `sess-${id}`, userId: new ObjectId(id), status: 'active' })));
  await Promise.all([
    StaffRoleRecord.deleteMany({}),
    MfaRecord.deleteMany({}).setOptions(SYSTEM),
    UserRecord.deleteMany({}),
    SessionRecord.deleteMany({}).setOptions(SYSTEM),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    InvitationRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** Gets a B2B admin pass for a staff member (no two-step login set up, inside the 7-day window). @param {string} id */
async function adminPass(id) {
  const res = await srv.post('/api/v1/admin/auth/session', {}, auth(existingToken(id)));
  expect(res.status).toBe(200);
  return /** @type {string} */ (res.body.adminToken);
}

describe('getting a B2B admin pass', () => {
  it('needs a B2B platform role; customers and anonymous callers are refused', async () => {
    expect((await srv.post('/api/v1/admin/auth/session', {}, auth(existingToken(STAFF.plain)))).body.code).toBe('NO_B2B_ADMIN_ROLE');
    expect((await srv.post('/api/v1/admin/auth/session', {})).status).toBe(401);
  });

  it('an existing admin login alone opens nothing; the pass does; logging out of the existing panel ends the pass', async () => {
    await staffRoles.setRoles(STAFF.ops, ['platform.operations'], 'cli');
    expect((await srv.get('/api/v1/admin/orgs', auth(existingToken(STAFF.ops)))).status).toBe(403);
    const pass = await adminPass(STAFF.ops);
    expect((await srv.get('/api/v1/admin/orgs', auth(pass))).status).toBe(200);
    await mongo.db.collection('sessions').updateOne({ sessionId: `sess-${STAFF.ops}` }, { $set: { status: 'logout' } });
    expect((await srv.get('/api/v1/admin/orgs', auth(pass))).status).toBe(401);
  });

  it('7 days to set up two-step login; then required; with it, the pass needs an app code', async () => {
    await staffRoles.setRoles(STAFF.ops, ['platform.operations'], 'cli');
    const first = await srv.post('/api/v1/admin/auth/session', {}, auth(existingToken(STAFF.ops)));
    expect(first.body.mfaSetupRequiredBy).toBe('2026-11-21T10:00:00.000Z');
    now = new Date('2026-11-21T10:00:00Z');
    expect((await srv.post('/api/v1/admin/auth/session', {}, auth(existingToken(STAFF.ops)))).body.code).toBe('MFA_ENROLMENT_REQUIRED');

    const setup = await srv.post('/api/v1/admin/auth/mfa/setup', {}, auth(existingToken(STAFF.ops)));
    expect(setup.body.otpauthUrl).toContain('ops%40musafirbaba.com');
    const enabled = await srv.post(
      '/api/v1/admin/auth/mfa/enable',
      { code: hotp(setup.body.secret, stepAt(now)) },
      auth(existingToken(STAFF.ops)),
    );
    expect(enabled.body.recoveryCodes).toHaveLength(10);
    expect((await srv.get('/api/v1/admin/orgs', auth(enabled.body.adminToken))).status).toBe(200);

    now = new Date(now.getTime() + 30_000);
    expect((await srv.post('/api/v1/admin/auth/session', {}, auth(existingToken(STAFF.ops)))).body.code).toBe('MFA_CODE_INVALID');
    const withCode = await srv.post(
      '/api/v1/admin/auth/session',
      { code: hotp(setup.body.secret, stepAt(now)) },
      auth(existingToken(STAFF.ops)),
    );
    expect(withCode.status).toBe(200);
    expect(withCode.body.mfaSetupRequiredBy).toBeNull();
  });
});

describe('managing organisations', () => {
  it('create an org and invite its owner; detail lists members', async () => {
    await staffRoles.setRoles(STAFF.ops, ['platform.operations'], 'cli');
    const pass = await adminPass(STAFF.ops);
    const created = await srv.post(
      '/api/v1/admin/orgs',
      { type: 'HOTEL', legalName: 'Sea View Hotels Pvt Ltd', displayName: 'Sea View', ownerEmail: 'owner@seaview.in' },
      auth(pass),
    );
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      reference: expect.stringMatching(/^MBHO-/),
      invitation: { email: 'owner@seaview.in', roles: ['hotel.owner'], invitedBy: `staff:${STAFF.ops}` },
    });
    expect(await JobRecord.countDocuments({ name: EMAIL_JOB })).toBe(1);
    const detail = await srv.get(`/api/v1/admin/orgs/${created.body.id}`, auth(pass));
    expect(detail.body).toMatchObject({ status: 'ONBOARDING', displayName: 'Sea View', members: [] });
    expect((await srv.get('/api/v1/admin/orgs?type=HOTEL&q=sea', auth(pass))).body.data).toHaveLength(1);
    expect((await srv.get('/api/v1/admin/orgs?type=CLIENT', auth(pass))).body.data).toHaveLength(0);
  });

  it('suspending ends every session opened in the org at once, records the reason; reactivating restores access', async () => {
    await staffRoles.setRoles(STAFF.ops, ['platform.operations'], 'cli');
    const pass = await adminPass(STAFF.ops);
    const owner = await users.create({ email: 'owner@acme.in', name: 'Owner', password: PASSWORD });
    const org = await orgs.createOrganization({
      type: 'CLIENT',
      legalName: 'Acme',
      ownerUserId: owner.id,
      status: 'ACTIVE',
      createdBy: 's',
    });
    const login = await srv.post('/api/v1/auth/login', { identifier: 'owner@acme.in', password: PASSWORD }, { 'x-b2b-auth': '1' });
    const token = login.body.accessToken;
    expect((await srv.get('/api/v1/members', auth(token))).status).toBe(200);

    const suspended = await srv.post(`/api/v1/admin/orgs/${org.id}/suspend`, { reason: 'KYC documents expired' }, auth(pass));
    expect(suspended.body).toEqual({ orgId: org.id, status: 'SUSPENDED', sessionsEnded: 1 });
    expect((await srv.get('/api/v1/members', auth(token))).status).toBe(401); // session ended
    const doc = await OrganizationRecord.findOne({ _id: org.id }).lean();
    expect(doc).toMatchObject({ status: 'SUSPENDED', statusReason: 'KYC documents expired' });
    expect(doc?.pendingEvents?.map((e) => e.type)).toContain('organizations.org.suspended');
    expect((await srv.post(`/api/v1/admin/orgs/${org.id}/suspend`, { reason: 'again please' }, auth(pass))).body.code).toBe(
      'ORG_NOT_ACTIVE',
    );

    expect((await srv.post(`/api/v1/admin/orgs/${org.id}/reactivate`, {}, auth(pass))).body.status).toBe('ACTIVE');
    const again = (await srv.post('/api/v1/auth/login', { identifier: 'owner@acme.in', password: PASSWORD }, { 'x-b2b-auth': '1' })).body
      .accessToken;
    expect((await srv.get('/api/v1/members', auth(again))).status).toBe(200);
  });

  it('Support can look but not change; nobody but staff with the pass reaches /admin', async () => {
    await staffRoles.setRoles(STAFF.support, ['platform.support'], 'cli');
    const pass = await adminPass(STAFF.support);
    expect((await srv.get('/api/v1/admin/orgs', auth(pass))).status).toBe(200);
    expect((await srv.post('/api/v1/admin/orgs', { type: 'CLIENT', legalName: 'Nope Pvt Ltd' }, auth(pass))).status).toBe(403);
    expect((await srv.put(`/api/v1/admin/staff/${STAFF.plain}/roles`, { roles: ['platform.support'] }, auth(pass))).status).toBe(403);
    const member = await users.create({ email: 'm@x.in', name: 'M', password: PASSWORD });
    await orgs.createOrganization({ type: 'CLIENT', legalName: 'X', ownerUserId: member.id, createdBy: 's' });
    const memberToken = (await srv.post('/api/v1/auth/login', { identifier: 'm@x.in', password: PASSWORD }, { 'x-b2b-auth': '1' })).body
      .accessToken;
    expect((await srv.get('/api/v1/admin/orgs', auth(memberToken))).status).toBe(403); // an org Owner is not an admin
  });
});

describe('staff roles and users', () => {
  it('a Super Admin gives staff roles; at most 2 Super Admins', async () => {
    await staffRoles.setRoles(STAFF.super1, ['platform.superAdmin'], 'cli');
    const pass = await adminPass(STAFF.super1);
    expect((await srv.put(`/api/v1/admin/staff/${STAFF.super2}/roles`, { roles: ['platform.superAdmin'] }, auth(pass))).status).toBe(200);
    expect((await srv.put(`/api/v1/admin/staff/${STAFF.super3}/roles`, { roles: ['platform.superAdmin'] }, auth(pass))).body.code).toBe(
      'SUPER_ADMIN_LIMIT',
    );
    expect(await StaffRoleRecord.exists({ _id: STAFF.super3 })).toBeNull(); // undone
    expect((await srv.put(`/api/v1/admin/staff/${STAFF.ops}/roles`, { roles: ['client.owner'] }, auth(pass))).body.code).toBe(
      'ROLE_UNKNOWN',
    );
    expect((await srv.get(`/api/v1/admin/staff/${STAFF.super2}/roles`, auth(pass))).body.roles).toEqual(['platform.superAdmin']);
  });

  it('Super Admins find staff by their admin email and see everyone with B2B access', async () => {
    await staffRoles.setRoles(STAFF.super1, ['platform.superAdmin'], 'cli');
    await staffRoles.setRoles(STAFF.support, ['platform.support'], 'cli');
    const pass = await adminPass(STAFF.super1);
    expect((await srv.get('/api/v1/admin/staff/lookup?email=OPS@musafirbaba.com', auth(pass))).body).toEqual({
      staffId: STAFF.ops,
      name: 'ops',
      email: 'ops@musafirbaba.com',
      isActive: true,
      roles: [],
    });
    expect((await srv.get('/api/v1/admin/staff/lookup?email=nobody@musafirbaba.com', auth(pass))).body.code).toBe('STAFF_NOT_FOUND');
    await srv.put(`/api/v1/admin/staff/${STAFF.ops}/roles`, { roles: ['platform.operations'] }, auth(pass));
    const list = (await srv.get('/api/v1/admin/staff', auth(pass))).body.data;
    expect(list.map((/** @type {any} */ x) => [x.email, x.roles])).toEqual(
      expect.arrayContaining([
        ['super1@musafirbaba.com', ['platform.superAdmin']],
        ['support@musafirbaba.com', ['platform.support']],
        ['ops@musafirbaba.com', ['platform.operations']],
      ]),
    );
    const support = await adminPass(STAFF.support);
    expect((await srv.get('/api/v1/admin/staff', auth(support))).status).toBe(403); // only staff managers
    expect((await mongo.db.collection('staffs').findOne({ _id: new ObjectId(STAFF.ops) }))?.roles).toBeUndefined(); // existing account untouched
  });

  it('search business users and see their memberships', async () => {
    await staffRoles.setRoles(STAFF.support, ['platform.support'], 'cli');
    const pass = await adminPass(STAFF.support);
    const u = await users.create({ email: 'ravi.kumar@acme.in', name: 'Ravi Kumar', password: PASSWORD });
    await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: u.id, createdBy: 's' });
    expect((await srv.get('/api/v1/admin/users?q=ravi', auth(pass))).body.data.map((/** @type {any} */ x) => x.email)).toEqual([
      'ravi.kumar@acme.in',
    ]);
    expect((await srv.get('/api/v1/admin/users?q=.*', auth(pass))).body.data).toEqual([]); // input is matched literally
    const detail = await srv.get(`/api/v1/admin/users/${u.id}`, auth(pass));
    expect(detail.body.memberships).toEqual([expect.objectContaining({ orgName: 'Acme', roles: ['client.owner'], status: 'ACTIVE' })]);
  });
});
