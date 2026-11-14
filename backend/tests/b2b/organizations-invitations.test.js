// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { unseal } from '../../src/b2b/core/crypto.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { EMAIL_JOB } from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import {
  createOrganizationsService,
  InvitationRecord,
  MemberRecord,
  OrganizationRecord,
} from '../../src/b2b/modules/organizations/index.js';
import { BranchRecord } from '../../src/b2b/modules/organizations/models/branch.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'invite', 'test', 'secret', 'long-enough-for-hmac-1'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-14T10:00:00Z');
const clock = { now: () => now };
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
    createB2BRouter({
      connect: false,
      logger: createLogger({ write: () => {} }),
      clock,
      env: { B2B_AUTH_SECRET: SECRET, B2B_PUBLIC_URL: 'https://musafirbaba.com' },
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
  await Promise.all([
    UserRecord.deleteMany({}),
    SessionRecord.deleteMany({}).setOptions(SYSTEM),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    BranchRecord.deleteMany({}).setOptions(SYSTEM),
    InvitationRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} email */
const newUser = async (email) => (await users.create({ email, name: 'Test User', password: PASSWORD })).id;
/** @param {string} email */
const login = async (email) => (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;
/** @param {string} token */
const auth = (token) => ({ authorization: `Bearer ${token}` });

/** The token from the latest invitation email (as the email job would send it). */
async function latestInviteToken() {
  const job = await JobRecord.findOne({ name: EMAIL_JOB }).sort({ _id: -1 }).lean();
  const message = /** @type {{ to: string, text: string }} */ (
    unseal(String(job?.payload?.sealed), { secret: SECRET, purpose: 'email-job' })
  );
  const link = /** @type {string} */ (/https:\/\/musafirbaba\.com\/business\/invite\?token=(\S+)/.exec(message.text)?.[1]);
  return { to: message.to, token: decodeURIComponent(link) };
}

/** A client org with an owner who is signed in. */
async function clientWithOwner() {
  const ownerId = await newUser('owner@acme.in');
  const org = await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme Travels', ownerUserId: ownerId, createdBy: 's' });
  return { ownerId, orgId: org.id, owner: await login('owner@acme.in') };
}

describe('invite → accept as a new user', () => {
  it('owner invites a branch-limited agent; the link signs them up straight into the org; single use', async () => {
    const { orgId, owner } = await clientWithOwner();
    const branch = (await srv.post('/api/v1/branches', { name: 'Delhi' }, auth(owner))).body;
    const invited = await srv.post(
      '/api/v1/invitations',
      { email: 'Agent@Acme.in', roles: ['client.bookingAgent'], branchIds: [branch.id] },
      auth(owner),
    );
    expect(invited.status).toBe(201);
    expect(invited.body).toMatchObject({ email: 'agent@acme.in', status: 'PENDING', roles: ['client.bookingAgent'] });

    const { to, token } = await latestInviteToken();
    expect(to).toBe('agent@acme.in');
    expect(JSON.stringify(await InvitationRecord.findOne({ orgId }).lean())).not.toContain(token.split('.')[1]); // only a hash is stored
    expect((await srv.get(`/api/v1/invitations/lookup?token=${encodeURIComponent(token)}`)).body).toMatchObject({
      email: 'agent@acme.in',
      orgName: 'Acme Travels',
      orgType: 'CLIENT',
    });

    const accepted = await srv.post('/api/v1/invitations/accept', { token, name: 'Ravi Agent', password: 'a-strong-passphrase' }, H);
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('set-cookie')).toMatch(/^b2b_refresh=/);
    const me = await srv.get('/api/v1/me', auth(accepted.body.accessToken));
    expect(me.body).toMatchObject({ currentOrgId: orgId, user: { email: 'agent@acme.in', emailVerified: true } });
    const member = await MemberRecord.findOne({ orgId, userId: me.body.user.id }).lean();
    expect(member).toMatchObject({ roles: ['client.bookingAgent'], branchIds: [branch.id] });
    expect(member?.pendingEvents?.map((e) => e.type)).toEqual(['organizations.member.joined']);

    expect((await srv.post('/api/v1/invitations/accept', { token, name: 'Again', password: 'a-strong-passphrase' }, H)).status).toBe(404);
    expect((await srv.get('/api/v1/invitations', auth(owner))).body.data).toEqual([]);
  });

  it("refuses granting more than you hold, unknown roles, roles of another org type and other orgs' branches", async () => {
    const { orgId, owner } = await clientWithOwner();
    const adminId = await newUser('admin@acme.in');
    await orgs.addMember({ orgId, userId: adminId, roles: ['client.admin'], addedBy: 's' });
    const admin = await login('admin@acme.in');
    expect((await srv.post('/api/v1/invitations', { email: 'boss@x.in', roles: ['client.owner'] }, auth(admin))).body.code).toBe(
      'CANNOT_GRANT_MORE_THAN_YOU_HAVE',
    );
    expect((await srv.post('/api/v1/invitations', { email: 'a@x.in', roles: ['client.accountant'] }, auth(admin))).status).toBe(201);
    expect((await srv.post('/api/v1/invitations', { email: 'b@x.in', roles: ['client.superhero'] }, auth(owner))).body.code).toBe(
      'ROLE_UNKNOWN',
    );
    expect((await srv.post('/api/v1/invitations', { email: 'c@x.in', roles: ['hotel.frontDesk'] }, auth(owner))).body.code).toBe(
      'ROLE_UNKNOWN',
    );
    expect(
      (
        await srv.post(
          '/api/v1/invitations',
          { email: 'd@x.in', roles: ['client.viewer'], branchIds: ['64b000000000000000000000'] },
          auth(owner),
        )
      ).body.code,
    ).toBe('BRANCH_NOT_FOUND');
    expect(
      (await srv.post('/api/v1/invitations', { email: 'e@x.in', roles: ['client.viewer'], orgId: '64b000000000000000000000' }, auth(owner)))
        .status,
    ).toBe(400);
  });
});

describe('invite → accept as an existing user', () => {
  it('signed out → must sign in first; signed in as the invited email → joins; another email → refused', async () => {
    const { orgId, owner } = await clientWithOwner();
    await newUser('ravi@x.in');
    await newUser('someone@x.in');
    await srv.post('/api/v1/invitations', { email: 'ravi@x.in', roles: ['client.viewer'] }, auth(owner));
    const { token } = await latestInviteToken();
    expect((await srv.post('/api/v1/invitations/accept', { token, name: 'Ravi', password: 'whatever-pass-1' }, H)).body.code).toBe(
      'ACCOUNT_EXISTS_SIGN_IN',
    );
    expect((await srv.post('/api/v1/invitations/accept', { token }, { ...H, ...auth(await login('someone@x.in')) })).body.code).toBe(
      'INVITATION_FOR_ANOTHER_EMAIL',
    );
    const ravi = await login('ravi@x.in');
    expect((await srv.post('/api/v1/invitations/accept', { token }, { ...H, ...auth(ravi) })).body).toEqual({ orgId });
    expect((await srv.get('/api/v1/me', auth(ravi))).body.memberships.map((/** @type {any} */ m) => m.orgId)).toEqual([orgId]);
  });
});

describe('pending invitations', () => {
  it('one open invitation per email; revoke kills the link; 7 days expiry; re-invite after expiry', async () => {
    const { owner } = await clientWithOwner();
    const first = await srv.post('/api/v1/invitations', { email: 'x@x.in', roles: ['client.viewer'] }, auth(owner));
    expect((await srv.post('/api/v1/invitations', { email: 'x@x.in', roles: ['client.viewer'] }, auth(owner))).body.code).toBe(
      'INVITATION_ALREADY_PENDING',
    );
    const { token } = await latestInviteToken();
    expect((await srv.del(`/api/v1/invitations/${first.body.id}`, auth(owner))).status).toBe(204);
    expect((await srv.get(`/api/v1/invitations/lookup?token=${encodeURIComponent(token)}`)).status).toBe(404);

    await srv.post('/api/v1/invitations', { email: 'x@x.in', roles: ['client.viewer'] }, auth(owner));
    const second = await latestInviteToken();
    now = new Date('2026-11-21T10:00:01Z');
    const ownerAgain = await login('owner@acme.in');
    expect((await srv.get(`/api/v1/invitations/lookup?token=${encodeURIComponent(second.token)}`)).status).toBe(404);
    expect((await srv.post('/api/v1/invitations', { email: 'x@x.in', roles: ['client.viewer'] }, auth(ownerAgain))).status).toBe(201);
  });
});

describe('removing members', () => {
  it('owner removes an agent: the agent loses the org at once; an admin cannot remove the owner', async () => {
    const { ownerId, orgId, owner } = await clientWithOwner();
    const agentId = await newUser('agent@acme.in');
    const adminId = await newUser('admin@acme.in');
    await orgs.addMember({ orgId, userId: agentId, roles: ['client.bookingAgent'], addedBy: 's' });
    await orgs.addMember({ orgId, userId: adminId, roles: ['client.admin'], addedBy: 's' });
    const agent = await login('agent@acme.in');
    expect((await srv.get('/api/v1/branches', auth(agent))).status).toBe(200);
    expect((await srv.del(`/api/v1/members/${agentId}`, auth(owner))).status).toBe(204);
    expect((await srv.get('/api/v1/branches', auth(agent))).status).toBe(403);
    expect((await srv.get('/api/v1/me', auth(agent))).body.currentOrgId).toBeNull();
    const removed = await MemberRecord.findOne({ orgId, userId: agentId }).lean();
    expect(removed?.pendingEvents?.map((e) => e.type)).toEqual(['organizations.member.joined', 'organizations.member.removed']);

    const admin = await login('admin@acme.in');
    expect((await srv.del(`/api/v1/members/${ownerId}`, auth(admin))).body.code).toBe('CANNOT_REMOVE_MORE_POWERFUL_MEMBER');
    expect((await srv.del('/api/v1/members/64b000000000000000000000', auth(owner))).status).toBe(404);
  });

  it('the last Owner cannot be removed — not even by two Owners removing each other at once', async () => {
    const { ownerId, orgId, owner } = await clientWithOwner();
    expect((await srv.del(`/api/v1/members/${ownerId}`, auth(owner))).body.code).toBe('LAST_OWNER');
    const secondId = await newUser('second@acme.in');
    await orgs.addMember({ orgId, userId: secondId, roles: ['client.owner'], addedBy: 's' });
    const second = await login('second@acme.in');
    await Promise.all([srv.del(`/api/v1/members/${secondId}`, auth(owner)), srv.del(`/api/v1/members/${ownerId}`, auth(second))]);
    expect(await MemberRecord.countDocuments({ orgId, status: 'ACTIVE', roles: 'client.owner' })).toBeGreaterThanOrEqual(1);
  });
});
