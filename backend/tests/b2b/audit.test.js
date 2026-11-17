// @ts-check
import express from 'express';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startBackground } from '../../src/b2b/background.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { AuditEventRecord, createAuditService } from '../../src/b2b/modules/audit/index.js';
import { createSessionService, createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'audit', 'test', 'secret', 'long-enough-for-hmac-12'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date() };
const quiet = createLogger({ write: () => {} });
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const audit = createAuditService({ clock });

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await Promise.all([
    AuditEventRecord.deleteMany({}).setOptions(SYSTEM),
    UserRecord.deleteMany({}),
    SessionRecord.deleteMany({}).setOptions(SYSTEM),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} type @param {Record<string, unknown>} payload @param {Date} [occurredAt] */
const event = (type, payload, occurredAt = new Date()) => ({ eventId: randomUUID(), type, occurredAt, payload });

describe('recording', () => {
  it('one entry per event, repeat-safe; the actor is whoever made the change', async () => {
    const e = event('organizations.member.roles-changed', {
      orgId: 'o1',
      userId: 'u2',
      changedBy: 'u1',
      before: ['client.viewer'],
      after: ['client.admin'],
    });
    await audit.record(e);
    await audit.record(e);
    const entries = await AuditEventRecord.find({}).setOptions(SYSTEM).lean();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      _id: e.eventId,
      action: 'organizations.member.roles-changed',
      orgId: 'o1',
      userId: 'u2',
      actorId: 'u1',
    });
    await audit.record(event('something.without.owner', { foo: 1 }));
    expect(await AuditEventRecord.countDocuments({}).setOptions(SYSTEM)).toBe(1);
  });
});

describe('the real flow through the background work', () => {
  it('creating an org, its owner joining and a sign-in all reach the activity log by themselves', async () => {
    const bg = startBackground({ clock, logger: quiet, runJobs: true, hub: { deliver: () => {} } });
    try {
      const owner = await users.create({ email: 'owner@acme.in', name: 'Owner', password: PASSWORD });
      const org = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: owner.id, createdBy: 'staff:1' });
      await createSessionService({ secret: SECRET, clock }).create({
        userId: owner.id,
        orgId: org.id,
        methods: ['password'],
        ip: '203.0.113.7',
      });
      await expect
        .poll(async () => (await AuditEventRecord.find({}).setOptions(SYSTEM).lean()).map((e) => e.action).sort(), {
          timeout: 15_000,
          interval: 250,
        })
        .toEqual(['identity.session.created', 'organizations.member.joined', 'organizations.org.created']);
      const signIn = await AuditEventRecord.findOne({ action: 'identity.session.created' }).setOptions(SYSTEM).lean();
      expect(signIn).toMatchObject({ userId: owner.id, orgId: org.id, data: { methods: ['password'], ip: '203.0.113.7' } });
    } finally {
      await bg.stop();
    }
  }, 30_000);
});

describe('reading the log over HTTP', () => {
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let admin;
  beforeAll(async () => {
    const app = express();
    app.use('/api/v1', createB2BRouter({ connect: false, logger: quiet, clock, env: { B2B_AUTH_SECRET: SECRET } }));
    srv = await startServer(app);
    const staffApp = express();
    staffApp.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger: quiet,
        clock,
        env: { B2B_AUTH_SECRET: SECRET },
        authenticate: async () => ({ type: 'staff', staffId: 's1', permissions: ['platform.audit.read'] }),
      }),
    );
    admin = await startServer(staffApp);
  });
  afterAll(async () => {
    await srv.close();
    await admin.close();
  });
  const H = { 'x-b2b-auth': '1' };
  /** @param {string} email */
  const login = async (email) => (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;
  /** @param {string} t */
  const auth = (t) => ({ authorization: `Bearer ${t}` });

  it("an owner sees only their org's entries, newest first, page by page; a viewer can't see the log", async () => {
    const owner = await users.create({ email: 'owner@acme.in', name: 'Owner', password: PASSWORD });
    const viewer = await users.create({ email: 'viewer@acme.in', name: 'Viewer', password: PASSWORD });
    const acme = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: owner.id, createdBy: 's' });
    await orgs.addMember({ orgId: acme.id, userId: viewer.id, roles: ['client.viewer'], addedBy: 's' });
    const t0 = Date.parse('2026-11-14T10:00:00Z');
    for (let i = 0; i < 5; i += 1)
      await audit.record(event('organizations.member.invited', { orgId: acme.id, invitedBy: owner.id, n: i }, new Date(t0 + i * 1000)));
    await audit.record(event('organizations.member.invited', { orgId: 'another-org', n: 99 }, new Date(t0)));

    const token = await login('owner@acme.in');
    const first = (await srv.get('/api/v1/audit?limit=2', auth(token))).body;
    expect(first.data.map((/** @type {any} */ e) => e.data.n)).toEqual([4, 3]);
    const second = (await srv.get(`/api/v1/audit?limit=2&before=${first.next}`, auth(token))).body;
    expect(second.data.map((/** @type {any} */ e) => e.data.n)).toEqual([2, 1]);
    const all = (await srv.get('/api/v1/audit?action=organizations.member.invited', auth(token))).body.data;
    expect(all.map((/** @type {any} */ e) => e.data.n)).toEqual([4, 3, 2, 1, 0]); // never the other org's
    expect((await srv.get('/api/v1/audit', auth(await login('viewer@acme.in')))).status).toBe(403);
    expect((await srv.get('/api/v1/audit?orgId=x', auth(token))).status).toBe(400); // can't ask for another org
    expect((await srv.get('/api/v1/admin/audit', auth(token))).status).toBe(403);
  });

  it('MusafirBaba admins (platform.audit.read) see every org and can filter', async () => {
    await audit.record(event('organizations.org.created', { orgId: '64b0000000000000000000a1' }));
    await audit.record(event('organizations.org.created', { orgId: '64b0000000000000000000b2' }));
    expect((await admin.get('/api/v1/admin/audit')).body.data).toHaveLength(2);
    expect(
      (await admin.get('/api/v1/admin/audit?orgId=64b0000000000000000000b2')).body.data.map((/** @type {any} */ e) => e.orgId),
    ).toEqual(['64b0000000000000000000b2']);
  });
});
