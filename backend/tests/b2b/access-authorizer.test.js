// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createContext } from '../../src/b2b/core/context.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { SIGNALS_COLLECTION } from '../../src/b2b/core/realtime/signals.js';
import { authz, RoleRecord } from '../../src/b2b/modules/access/index.js';
import { createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { BranchRecord } from '../../src/b2b/modules/organizations/models/branch.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const quiet = createLogger({ write: () => {} });
/** @param {import('../../src/b2b/core/context.js').Actor} actor */
const ctxOf = (actor) => createContext({ requestId: 't', channel: 'B2B_PORTAL', actor, logger: quiet });
/** @param {Record<string, unknown>} [extra] @returns {import('../../src/b2b/core/context.js').Actor} */
const member = (extra = {}) => /** @type {any} */ ({ type: 'member', userId: 'u1', orgId: 'o1', permissions: ['x.y.read'], ...extra });
/** @param {() => void} fn */
const codeOf = (fn) => {
  try {
    fn();
    return 'OK';
  } catch (e) {
    return `${/** @type {any} */ (e).status} ${/** @type {any} */ (e).code}`;
  }
};

describe('authz.assert (pure)', () => {
  it.each([
    ['anonymous', { type: 'anonymous' }, 'x.y.read', {}, '401 UNAUTHENTICATED'],
    ['signed in, no org open', { type: 'user', userId: 'u1', sessionId: 's' }, 'x.y.read', {}, '403 ORG_NOT_SELECTED'],
    ['member without the permission', member(), 'x.y.write', {}, '403 PERMISSION_DENIED'],
    ['member, own org', member(), 'x.y.read', { orgId: 'o1' }, 'OK'],
    ['member, other org', member(), 'x.y.read', { orgId: 'o2' }, '404 NOT_FOUND'],
    ['branch-limited, inside', member({ branchIds: ['b1'] }), 'x.y.read', { orgId: 'o1', branchId: 'b1' }, 'OK'],
    ['branch-limited, other branch', member({ branchIds: ['b1'] }), 'x.y.read', { orgId: 'o1', branchId: 'b2' }, '404 NOT_FOUND'],
    ['branch-limited, record without branch', member({ branchIds: ['b1'] }), 'x.y.read', { orgId: 'o1', branchId: null }, '404 NOT_FOUND'],
    ['not branch-limited, any branch', member(), 'x.y.read', { orgId: 'o1', branchId: 'b9' }, 'OK'],
    ['property-limited, other property', member({ propertyIds: ['p1'] }), 'x.y.read', { orgId: 'o1', propertyId: 'p2' }, '404 NOT_FOUND'],
    ['property-limited, inside', member({ propertyIds: ['p1'] }), 'x.y.read', { orgId: 'o1', propertyId: 'p1' }, 'OK'],
    ["own-only, someone else's", member({ ownOnly: true }), 'x.y.read', { orgId: 'o1', createdBy: 'u2' }, '404 NOT_FOUND'],
    ['own-only, own', member({ ownOnly: true }), 'x.y.read', { orgId: 'o1', createdBy: 'u1' }, 'OK'],
    ['staff with the permission, any org', { type: 'staff', staffId: 's1', permissions: ['x.y.read'] }, 'x.y.read', { orgId: 'o2' }, 'OK'],
    ['staff without it', { type: 'staff', staffId: 's1', permissions: [] }, 'x.y.read', {}, '403 PERMISSION_DENIED'],
    ['customer, own record', { type: 'customer', customerId: 'c1' }, null, { customerId: 'c1' }, 'OK'],
    ['customer, other record', { type: 'customer', customerId: 'c1' }, null, { customerId: 'c2' }, '404 NOT_FOUND'],
    [
      'customer asking for a business permission',
      { type: 'customer', customerId: 'c1' },
      'x.y.read',
      { customerId: 'c1' },
      '404 NOT_FOUND',
    ],
    ['system', { type: 'system', reason: 'job' }, 'x.y.read', { orgId: 'o9' }, 'OK'],
  ])('%s', (_name, actor, permission, record, expected) => {
    expect(codeOf(() => authz.assert(ctxOf(/** @type {any} */ (actor)), permission, record))).toBe(expected);
  });

  it('scopeFilter limits lists the same way', () => {
    expect(
      authz.scopeFilter(ctxOf(member({ branchIds: ['b1'], propertyIds: ['p1'], ownOnly: true })), {
        branchField: 'branchId',
        propertyField: 'propertyId',
        createdByField: 'createdBy',
      }),
    ).toEqual({
      orgId: 'o1',
      branchId: { $in: ['b1'] },
      propertyId: { $in: ['p1'] },
      createdBy: 'u1',
    });
    expect(authz.scopeFilter(ctxOf(member()), { branchField: 'branchId' })).toEqual({ orgId: 'o1' });
    expect(authz.scopeFilter(ctxOf(member()), { orgField: 'clientOrgId' })).toEqual({ clientOrgId: 'o1' });
    expect(authz.scopeFilter(ctxOf({ type: 'staff', staffId: 's', permissions: [] }))).toEqual({});
    expect(() => authz.scopeFilter(ctxOf({ type: 'anonymous' }))).toThrow(expect.objectContaining({ status: 401 }));
    expect(authz.can(ctxOf(member()), 'x.y.read')).toBe(true);
    expect(authz.can(ctxOf({ type: 'customer', customerId: 'c' }), 'x.y.read')).toBe(false);
  });
});

describe('real requests: branch limits and the 60 s permission cache', () => {
  const SECRET = ['b2b', 'authz', 'test', 'secret', 'long-enough-for-hmac-12'].join('-');
  const PASSWORD = 'correct-horse-battery';
  const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
  const H = { 'x-b2b-auth': '1' };
  let now = new Date('2026-11-14T10:00:00Z');
  const clock = { now: () => now };
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
    app.use('/api/v1', createB2BRouter({ connect: false, logger: quiet, clock, env: { B2B_AUTH_SECRET: SECRET } }));
    srv = await startServer(app);
  });
  afterAll(async () => {
    await srv.close();
    await mongo.stop();
  });
  beforeEach(async () => {
    now = new Date('2026-11-14T10:00:00Z');
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

  async function setup() {
    const ownerId = await newUser('owner@acme.in');
    const agentId = await newUser('agent@acme.in');
    const org = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme', ownerUserId: ownerId, createdBy: 's' });
    await orgs.addMember({ orgId: org.id, userId: agentId, roles: ['client.viewer'], addedBy: 's' });
    const owner = await login('owner@acme.in');
    const a = (await srv.post('/api/v1/branches', { name: 'Delhi' }, auth(owner))).body;
    const b = (await srv.post('/api/v1/branches', { name: 'Mumbai' }, auth(owner))).body;
    return { orgId: org.id, agentId, owner, a, b };
  }

  it('a branch-limited member sees and edits only their own branches; other branches look missing', async () => {
    const { agentId, owner, a, b } = await setup();
    const role = (
      await srv.post(
        '/api/v1/roles',
        { name: 'Branch Manager', permissions: ['organizations.org.read', 'organizations.branch.read', 'organizations.branch.manage'] },
        auth(owner),
      )
    ).body;
    await srv.put(`/api/v1/members/${agentId}/roles`, { roles: [role.ref], branchIds: [a.id] }, auth(owner));
    const agent = await login('agent@acme.in');
    expect((await srv.get('/api/v1/branches', auth(agent))).body.data.map((/** @type {any} */ x) => x.name)).toEqual(['Delhi']);
    expect((await srv.patch(`/api/v1/branches/${b.id}`, { name: 'Taken' }, auth(agent))).status).toBe(404);
    expect((await srv.patch(`/api/v1/branches/${a.id}`, { city: 'New Delhi' }, auth(agent))).body.city).toBe('New Delhi');
    expect((await srv.get('/api/v1/branches', auth(owner))).body.data).toHaveLength(2); // not limited
  });

  it('permissions are cached for 60 s; a change made through the app clears the cache at once and signals other servers', async () => {
    const { orgId, agentId, owner } = await setup();
    const agent = await login('agent@acme.in');
    expect((await srv.get('/api/v1/members', auth(agent))).status).toBe(403); // viewer — now cached

    // a change made behind the app's back is only seen after the cache expires
    await MemberRecord.updateOne({ orgId, userId: agentId }, { $set: { roles: ['client.admin'] } });
    expect((await srv.get('/api/v1/members', auth(agent))).status).toBe(403);
    now = new Date('2026-11-14T10:01:01Z');
    expect((await srv.get('/api/v1/members', auth(agent))).status).toBe(200);

    // a change made through the app applies immediately…
    const before = await mongo.db.collection(SIGNALS_COLLECTION).countDocuments({ room: 'cache:evict' });
    await srv.put(`/api/v1/members/${agentId}/roles`, { roles: ['client.viewer'] }, auth(await login('owner@acme.in')));
    expect((await srv.get('/api/v1/members', auth(agent))).status).toBe(403);
    // …and tells the other backend processes to forget it too
    const signal = await mongo.db.collection(SIGNALS_COLLECTION).find({ room: 'cache:evict' }).sort({ _id: -1 }).limit(1).next();
    expect(await mongo.db.collection(SIGNALS_COLLECTION).countDocuments({ room: 'cache:evict' })).toBe(before + 1);
    expect(signal?.data).toEqual({ prefix: `member:${orgId}:${agentId}:` });
    expect(owner).toBeTruthy();
  });

  it('removing a member clears their cached permissions at once', async () => {
    const { orgId, agentId, owner } = await setup();
    const agent = await login('agent@acme.in');
    expect((await srv.get('/api/v1/me', auth(agent))).body.currentOrgId).toBe(orgId); // cached as a member
    expect((await srv.del(`/api/v1/members/${agentId}`, auth(owner))).status).toBe(204);
    expect((await srv.get('/api/v1/me', auth(agent))).body.currentOrgId).toBeNull();
  });
});
