// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { definePermissions, mergeCatalogues } from '../../src/b2b/core/permissions.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { assertCustomRolePermissions, normaliseRoleName } from '../../src/b2b/modules/access/domain/custom-roles.js';
import { RoleRecord } from '../../src/b2b/modules/access/index.js';
import { createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { BranchRecord } from '../../src/b2b/modules/organizations/models/branch.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { PERMISSION_CATALOGUE } from '../../src/b2b/permission-catalogue.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'roles', 'test', 'secret', 'long-enough-for-hmac-12'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-14T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

describe('custom role rules (pure)', () => {
  const extra = definePermissions('Money', {
    bank: { code: 'hotel-catalog.bank.update', description: 'Change payout bank details', orgTypes: ['HOTEL'], sensitive: true },
    book: { code: 'hotel-booking.booking.create', description: 'Make bookings', orgTypes: ['CLIENT'] },
  }).catalogue;
  const catalogue = mergeCatalogues([PERMISSION_CATALOGUE, extra]);
  const all = (/** @type {'CLIENT' | 'HOTEL'} */ t) => new Set(catalogue.filter((p) => p.orgTypes.includes(t)).map((p) => p.code));

  it('only allowed, non-sensitive permissions the creator holds', () => {
    expect(
      assertCustomRolePermissions(['hotel-booking.booking.create', 'organizations.branch.read', 'organizations.branch.read'], {
        orgType: 'CLIENT',
        catalogue,
        actorPermissions: all('CLIENT'),
      }),
    ).toEqual(['hotel-booking.booking.create', 'organizations.branch.read']);
    expect(() =>
      assertCustomRolePermissions(['platform.org.manage'], { orgType: 'CLIENT', catalogue, actorPermissions: all('CLIENT') }),
    ).toThrow(expect.objectContaining({ code: 'PERMISSION_NOT_ALLOWED' }));
    expect(() =>
      assertCustomRolePermissions(['hotel-booking.booking.create'], { orgType: 'HOTEL', catalogue, actorPermissions: all('HOTEL') }),
    ).toThrow(expect.objectContaining({ code: 'PERMISSION_NOT_ALLOWED' }));
    expect(() =>
      assertCustomRolePermissions(['hotel-catalog.bank.update'], { orgType: 'HOTEL', catalogue, actorPermissions: all('HOTEL') }),
    ).toThrow(expect.objectContaining({ code: 'PERMISSION_SENSITIVE' }));
    expect(() =>
      assertCustomRolePermissions(['organizations.member.invite'], {
        orgType: 'CLIENT',
        catalogue,
        actorPermissions: new Set(['organizations.org.read']),
      }),
    ).toThrow(expect.objectContaining({ code: 'CANNOT_GRANT_MORE_THAN_YOU_HAVE' }));
    expect(() => assertCustomRolePermissions([], { orgType: 'CLIENT', catalogue, actorPermissions: all('CLIENT') })).toThrow(
      expect.objectContaining({ code: 'ROLE_NEEDS_PERMISSIONS' }),
    );
    expect(normaliseRoleName('  Junior   Agent ')).toEqual({ name: 'Junior Agent', nameKey: 'junior agent' });
  });
});

describe('roles over HTTP (real router)', () => {
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
      RoleRecord.deleteMany({}).setOptions(SYSTEM),
      mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    ]);
  });

  /** @param {string} email */
  const newUser = async (email) => (await users.create({ email, name: 'Test User', password: PASSWORD })).id;
  /** @param {string} email */
  const login = async (email) => (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;
  /** @param {string} token */
  const auth = (token) => ({ authorization: `Bearer ${token}` });
  /** @param {string} path @param {unknown} body @param {string} token */
  const put = (path, body, token) => srv.put(path, body, auth(token));

  async function setup() {
    const ownerId = await newUser('owner@acme.in');
    const agentId = await newUser('agent@acme.in');
    const org = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: ownerId, createdBy: 's' });
    await orgs.addMember({ orgId: org.id, userId: agentId, roles: ['client.viewer'], addedBy: 's' });
    return { ownerId, agentId, orgId: org.id, owner: await login('owner@acme.in') };
  }

  it('lists the 5 client system roles and only client permissions to choose from', async () => {
    const { owner } = await setup();
    const roles = (await srv.get('/api/v1/roles', auth(owner))).body.data;
    expect(roles.map((/** @type {any} */ r) => r.ref)).toEqual([
      'client.owner',
      'client.admin',
      'client.bookingAgent',
      'client.accountant',
      'client.viewer',
    ]);
    const choosable = (await srv.get('/api/v1/roles/permissions', auth(owner))).body.data;
    expect(choosable.map((/** @type {any} */ p) => p.code)).toContain('organizations.branch.read');
    expect(choosable.some((/** @type {any} */ p) => /^(platform|admin)\./.test(p.code))).toBe(false);
  });

  it('"Junior Agent": create, give to a member limited to one branch, edit takes effect, delete only when unused', async () => {
    const { agentId, owner } = await setup();
    const branch = (await srv.post('/api/v1/branches', { name: 'Delhi' }, auth(owner))).body;
    const created = await srv.post(
      '/api/v1/roles',
      { name: 'Junior Agent', description: 'Search and book', permissions: ['organizations.org.read', 'organizations.branch.read'] },
      auth(owner),
    );
    expect(created.status).toBe(201);
    expect(created.body.ref).toMatch(/^custom:[a-f0-9]{24}$/);
    expect(
      (await srv.post('/api/v1/roles', { name: 'junior agent', permissions: ['organizations.org.read'] }, auth(owner))).body.code,
    ).toBe('ROLE_NAME_TAKEN');
    expect((await srv.post('/api/v1/roles', { name: 'Sneaky', permissions: ['platform.org.manage'] }, auth(owner))).body.code).toBe(
      'PERMISSION_NOT_ALLOWED',
    );

    const assigned = await put(`/api/v1/members/${agentId}/roles`, { roles: [created.body.ref], branchIds: [branch.id] }, owner);
    expect(assigned.status).toBe(200);
    expect(assigned.body).toMatchObject({ roles: [created.body.ref], branchIds: [branch.id], ownOnly: false });
    const agent = await login('agent@acme.in');
    expect((await srv.get('/api/v1/branches', auth(agent))).status).toBe(200);
    expect((await srv.get('/api/v1/members', auth(agent))).status).toBe(403);

    await srv.patch(
      `/api/v1/roles/${created.body.ref.slice(7)}`,
      { permissions: ['organizations.org.read', 'organizations.branch.read', 'organizations.member.read'] },
      auth(owner),
    );
    expect((await srv.get('/api/v1/members', auth(agent))).status).toBe(200); // the edit applies to everyone holding the role

    expect((await srv.del(`/api/v1/roles/${created.body.ref.slice(7)}`, auth(owner))).body.code).toBe('ROLE_IN_USE');
    await put(`/api/v1/members/${agentId}/roles`, { roles: ['client.viewer'] }, owner);
    expect((await srv.del(`/api/v1/roles/${created.body.ref.slice(7)}`, auth(owner))).status).toBe(204);
    expect((await srv.post('/api/v1/roles', { name: 'Junior Agent', permissions: ['organizations.org.read'] }, auth(owner))).status).toBe(
      201,
    ); // name free again
    const doc = await RoleRecord.findOne({ _id: created.body.ref.slice(7) })
      .setOptions(SYSTEM)
      .lean();
    expect(doc?.pendingEvents?.map((e) => e.payload.change)).toEqual(['created', 'updated', 'deleted']);
  });

  it("another org's custom role can't be given; roles of another org type are unknown", async () => {
    const { agentId, owner } = await setup();
    const otherOwner = await newUser('o@other.in');
    await orgs.createOrganization({ type: 'CLIENT', legalName: 'Other', ownerUserId: otherOwner, createdBy: 's' });
    const foreign = (
      await srv.post('/api/v1/roles', { name: 'Theirs', permissions: ['organizations.org.read'] }, auth(await login('o@other.in')))
    ).body;
    expect((await put(`/api/v1/members/${agentId}/roles`, { roles: [foreign.ref] }, owner)).body.code).toBe('ROLE_UNKNOWN');
    expect((await put(`/api/v1/members/${agentId}/roles`, { roles: ['hotel.manager'] }, owner)).body.code).toBe('ROLE_UNKNOWN');
    expect((await srv.patch(`/api/v1/roles/${foreign.ref.slice(7)}`, { name: 'Mine' }, auth(owner))).status).toBe(404);
  });

  it('Owner role: only Owners give or take it; the last Owner keeps it', async () => {
    const { ownerId, agentId, orgId, owner } = await setup();
    const adminId = await newUser('admin@acme.in');
    await orgs.addMember({ orgId, userId: adminId, roles: ['client.admin'], addedBy: 's' });
    const admin = await login('admin@acme.in');
    expect((await put(`/api/v1/members/${agentId}/roles`, { roles: ['client.owner'] }, admin)).body.code).toBe(
      'CANNOT_GRANT_MORE_THAN_YOU_HAVE',
    );
    expect((await put(`/api/v1/members/${ownerId}/roles`, { roles: ['client.viewer'] }, admin)).body.code).toBe(
      'CANNOT_CHANGE_MORE_POWERFUL_MEMBER',
    );

    expect((await put(`/api/v1/members/${ownerId}/roles`, { roles: ['client.admin'] }, owner)).body.code).toBe('LAST_OWNER');
    expect((await MemberRecord.findOne({ orgId, userId: ownerId }).lean())?.roles).toEqual(['client.owner']); // put back

    expect((await put(`/api/v1/members/${agentId}/roles`, { roles: ['client.owner'] }, owner)).status).toBe(200);
    expect((await put(`/api/v1/members/${ownerId}/roles`, { roles: ['client.admin'] }, owner)).status).toBe(200); // another Owner exists now
  });

  it('bodies are strict', async () => {
    const { agentId, owner } = await setup();
    expect((await put(`/api/v1/members/${agentId}/roles`, { roles: ['client.viewer'], orgId: 'x' }, owner)).status).toBe(400);
    expect((await srv.post('/api/v1/roles', { name: 'X', permissions: { $ne: null } }, auth(owner))).status).toBe(400);
  });
});
