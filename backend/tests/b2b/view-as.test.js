// @ts-check
/**
 * View as client/hotel (S01-T15). Uses an in-memory database with `staffs` / `sessions` records
 * SHAPED like the existing app's — never real data.
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
import { createMfaService, createUserRepository, UserRecord, ViewAsRecord } from '../../src/b2b/modules/identity/index.js';
import { MfaRecord } from '../../src/b2b/modules/identity/models/mfa.model.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { BranchRecord } from '../../src/b2b/modules/organizations/models/branch.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createStaffRoles } from '../../src/b2b/routes/admin-wiring.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const EXISTING_SECRET = ['existing', 'viewas', 'secret', 'for-tests-only', '7'].join('-');
const B2B_SECRET = ['b2b', 'viewas', 'test', 'secret', 'long-enough-for-hmac'].join('-');
let now = new Date('2026-11-15T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const SUPPORT = '64b0000000000000000000b1';
const SUPER = '64b0000000000000000000b2';
/** existing-app admin token @param {string} id */
const existingToken = (id) =>
  jwt.sign({ sub: id, role: 'admin', permissions: [], sessionId: `sess-${id}` }, EXISTING_SECRET, { expiresIn: '1d' });
/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });
const REASON = 'Hotel asked for help with their team page';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
const staffRoles = createStaffRoles(clock);
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });
let orgId = '';

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  for (const id of [SUPPORT, SUPER])
    await mongo.db.collection('staffs').insertOne({
      _id: new ObjectId(id),
      name: id === SUPPORT ? 'support' : 'super',
      email: `${id}@musafirbaba.com`,
      role: 'admin',
      isActive: true,
    });
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
  now = new Date('2026-11-15T10:00:00Z');
  await mongo.db.collection('sessions').deleteMany({});
  await mongo.db
    .collection('sessions')
    .insertMany([SUPPORT, SUPER].map((id) => ({ sessionId: `sess-${id}`, userId: new ObjectId(id), status: 'active' })));
  await Promise.all([
    StaffRoleRecord.deleteMany({}),
    MfaRecord.deleteMany({}).setOptions(SYSTEM),
    UserRecord.deleteMany({}),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    BranchRecord.deleteMany({}).setOptions(SYSTEM),
    ViewAsRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
  await staffRoles.setRoles(SUPPORT, ['platform.support'], 'cli');
  await staffRoles.setRoles(SUPER, ['platform.superAdmin'], 'cli');
  const owner = await users.create({ email: 'owner@acme.in', name: 'Owner', password: 'correct-horse-battery' });
  orgId = (
    await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme Travels', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
  ).id;
});

/** @param {string} staffId */
async function adminPass(staffId) {
  return (await srv.post('/api/v1/admin/auth/session', {}, auth(existingToken(staffId)))).body.adminToken;
}

describe('view as a client or hotel', () => {
  it('Support views read-only: sees what the Owner sees, every change is refused by the server, owners are emailed', async () => {
    const started = await srv.post('/api/v1/admin/view-as', { orgId, reason: REASON }, auth(await adminPass(SUPPORT)));
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ mode: 'READ', expiresAt: '2026-11-15T10:30:00.000Z' });
    const token = started.body.viewAsToken;

    const me = (await srv.get('/api/v1/me', auth(token))).body;
    expect(me).toMatchObject({
      currentOrgId: orgId,
      viewAs: { mode: 'READ', reason: REASON },
      user: { name: 'MusafirBaba support (view as)' },
    });
    expect(me.permissions).toContain('organizations.member.read');
    expect((await srv.get('/api/v1/members', auth(token))).status).toBe(200);
    const blocked = await srv.post('/api/v1/branches', { name: 'Sneaky' }, auth(token));
    expect([blocked.status, blocked.body.code]).toEqual([403, 'VIEW_AS_READ_ONLY']);
    expect(await BranchRecord.countDocuments({ orgId })).toBe(0);
    expect(await JobRecord.countDocuments({ name: EMAIL_JOB })).toBe(1); // the Owner's notice

    expect((await srv.post('/api/v1/view-as/end', {}, auth(token))).status).toBe(204);
    expect((await srv.get('/api/v1/me', auth(token))).status).toBe(401);
    const record = await ViewAsRecord.findOne({ orgId }).lean();
    expect(record?.pendingEvents?.map((e) => e.type)).toEqual(['identity.view-as.started', 'identity.view-as.ended']);
  });

  it('a reason is required; making changes needs the write permission AND a fresh app code', async () => {
    const support = await adminPass(SUPPORT);
    expect((await srv.post('/api/v1/admin/view-as', { orgId, reason: 'short' }, auth(support))).status).toBe(400);
    expect((await srv.post('/api/v1/admin/view-as', { orgId, reason: REASON, mode: 'WRITE' }, auth(support))).body.code).toBe(
      'PERMISSION_DENIED',
    );

    const superPass = await adminPass(SUPER);
    expect((await srv.post('/api/v1/admin/view-as', { orgId, reason: REASON, mode: 'WRITE' }, auth(superPass))).body.code).toBe(
      'STEP_UP_REQUIRED',
    );
    const mfa = createMfaService({ secret: B2B_SECRET, clock });
    const { secret } = await mfa.setup(`staff:${SUPER}`, 'super');
    await mfa.enable(`staff:${SUPER}`, hotp(secret, stepAt(now)));
    now = new Date(now.getTime() + 30_000);
    const write = await srv.post(
      '/api/v1/admin/view-as',
      { orgId, reason: REASON, mode: 'WRITE', code: hotp(secret, stepAt(now)) },
      auth(superPass),
    );
    expect(write.body.mode).toBe('WRITE');
    expect((await srv.post('/api/v1/branches', { name: 'Fixed for them' }, auth(write.body.viewAsToken))).status).toBe(201);
  });

  it('ends by itself after 30 minutes, and when the admin logs out of the existing panel', async () => {
    const a = (await srv.post('/api/v1/admin/view-as', { orgId, reason: REASON }, auth(await adminPass(SUPPORT)))).body.viewAsToken;
    now = new Date('2026-11-15T10:30:01Z');
    expect((await srv.get('/api/v1/me', auth(a))).status).toBe(401);
    now = new Date('2026-11-15T11:00:00Z');
    const b = (await srv.post('/api/v1/admin/view-as', { orgId, reason: REASON }, auth(await adminPass(SUPPORT)))).body.viewAsToken;
    expect((await srv.get('/api/v1/me', auth(b))).status).toBe(200);
    await mongo.db.collection('sessions').updateOne({ sessionId: `sess-${SUPPORT}` }, { $set: { status: 'logout' } });
    expect((await srv.get('/api/v1/me', auth(b))).status).toBe(401);
  });

  it("an org's own Owner cannot use view-as; unknown orgs are not found", async () => {
    const owner = (
      await srv.post('/api/v1/auth/login', { identifier: 'owner@acme.in', password: 'correct-horse-battery' }, { 'x-b2b-auth': '1' })
    ).body.accessToken;
    expect((await srv.post('/api/v1/admin/view-as', { orgId, reason: REASON }, auth(owner))).status).toBe(403);
    expect(
      (await srv.post('/api/v1/admin/view-as', { orgId: '64b000000000000000000000', reason: REASON }, auth(await adminPass(SUPPORT)))).body
        .code,
    ).toBe('ORG_NOT_FOUND');
  });
});
