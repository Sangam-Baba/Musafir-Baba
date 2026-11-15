// @ts-check
/** Hotel self-registration (S02-T05): one form → owner account, hotel org (ONBOARDING), draft KYC application, signed in. */
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { unseal } from '../../src/b2b/core/crypto.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { EMAIL_JOB } from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'registration', 'test', 'secret', 'long-enough-1'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-15T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

const details = {
  legalName: 'Sea View Hotels Private Limited',
  contactName: 'Asha Rao',
  mobile: '98765 43210',
  email: 'Owner@SeaView.in',
  gstRegistered: true,
  gstin: '27AAPFU0939F1ZV',
  pan: 'AAPFU0939F',
  address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
  propertyCount: 2,
  termsAccepted: true,
  termsVersion: '2026-11',
};
const owner = { name: 'Asha Rao', password: PASSWORD };

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;

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
      env: { B2B_AUTH_SECRET: SECRET, B2B_PUBLIC_URL: 'https://musafirbaba.com/' },
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
  await Promise.all([
    UserRecord.deleteMany({}),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    ApplicationRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });
/** @param {Record<string, unknown>} body @param {Record<string, string>} [headers] */
const register = (body, headers = {}) => srv.post('/api/v1/registrations/hotel', body, { ...H, ...headers });

describe('hotel self-registration', () => {
  it('creates the owner, the hotel (onboarding), the draft application, and signs in', async () => {
    const res = await register({ details, owner });
    expect(res.status).toBe(201);
    const token = res.body.accessToken;
    expect(token).toBeTruthy();
    expect(res.headers.get('set-cookie')).toContain('b2b_refresh=');

    const me = (await srv.get('/api/v1/me', auth(token))).body;
    expect(me.user).toMatchObject({ email: 'owner@seaview.in', name: 'Asha Rao' });
    const org = await OrganizationRecord.findOne({ _id: me.currentOrgId }).lean();
    expect(org).toMatchObject({ type: 'HOTEL', status: 'ONBOARDING', legalName: 'Sea View Hotels Private Limited' });

    const kyc = await srv.get('/api/v1/kyc', auth(token));
    expect(kyc.status).toBe(200);
    expect(kyc.body).toMatchObject({
      status: 'DRAFT',
      orgType: 'HOTEL',
      details: { gstin: '27AAPFU0939F1ZV', mobile: '+919876543210', email: 'owner@seaview.in' },
      risk: { flags: [], highRisk: false },
      documents: [],
    });
  });

  it('emails a verification link that marks the email verified (once the link is valid)', async () => {
    await register({ details, owner });
    const job = await JobRecord.findOne({ name: EMAIL_JOB }).lean();
    const message = /** @type {any} */ (unseal(String(/** @type {any} */ (job)?.payload.sealed), { secret: SECRET, purpose: 'email-job' }));
    expect(message.to).toBe('owner@seaview.in');
    const link = /https:\/\/musafirbaba\.com\/business\/verify-email#token=(\S+)/.exec(message.text);
    expect(link).not.toBeNull();
    const token = decodeURIComponent(/** @type {string} */ (link?.[1]));

    const bad = await srv.post('/api/v1/registrations/verify-email', { token: `${token.slice(0, -2)}xx` });
    expect([bad.status, bad.body.code]).toEqual([404, 'VERIFICATION_LINK_INVALID']);
    expect((await srv.post('/api/v1/registrations/verify-email', { token })).body).toEqual({ emailVerified: true });
    expect((await UserRecord.findOne({ email: 'owner@seaview.in' }).lean())?.emailVerifiedAt).toBeTruthy();

    now = new Date('2026-11-17T10:00:01Z'); // 48 hours later
    expect((await srv.post('/api/v1/registrations/verify-email', { token })).status).toBe(404);
  });

  it('a GSTIN already used by another hotel is flagged for a second approver', async () => {
    await register({ details, owner });
    const second = await register({ details: { ...details, email: 'other@seaview.in', legalName: 'Copy Hotels' }, owner });
    expect(second.status).toBe(201);
    const kyc = (await srv.get('/api/v1/kyc', auth(second.body.accessToken))).body;
    expect(kyc.risk).toEqual({ flags: ['DUPLICATE_GSTIN'], highRisk: true });
  });

  it('an existing email must sign in first; a signed-in user registers another hotel without a new account', async () => {
    const first = await register({ details, owner });
    const again = await register({ details, owner });
    expect([again.status, again.body.code]).toEqual([409, 'ACCOUNT_EXISTS_SIGN_IN']);

    const more = await register({ details: { ...details, legalName: 'Hill View Hotels' } }, auth(first.body.accessToken));
    expect(more.status).toBe(201);
    expect(await UserRecord.countDocuments({})).toBe(1);
    const me = (await srv.get('/api/v1/me', auth(more.body.accessToken))).body;
    expect(me.memberships ?? me.orgs).toHaveLength(2);
    expect(await JobRecord.countDocuments({ name: EMAIL_JOB })).toBe(1); // no second verification email
  });

  it('refuses bad details (all problems at once), a missing name/password, and missing headers', async () => {
    const bad = await register({ details: { ...details, pan: 'AAPFU0940F', address: { ...details.address, pin: '0123' } }, owner });
    expect([bad.status, bad.body.code]).toEqual([422, 'KYC_DETAILS_INVALID']);
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code).sort()).toEqual(['PAN_NOT_IN_GSTIN', 'PIN_INVALID']);
    expect((await register({ details })).body.code).toBe('NAME_AND_PASSWORD_REQUIRED');
    expect((await srv.post('/api/v1/registrations/hotel', { details, owner })).status).toBe(401); // no X-B2B-Auth (same rule as sign-in)
    expect((await register({ details, owner, orgId: 'x' })).status).toBe(400); // strict input
    expect(await OrganizationRecord.countDocuments({}).setOptions(SYSTEM)).toBe(0);
  });

  it('is limited to 10 registrations per hour from one address', async () => {
    for (let i = 0; i < 10; i += 1) expect((await register({ details: { ...details, pan: 'bad' }, owner })).status).toBe(422);
    const limited = await register({ details, owner });
    expect(limited.status).toBe(429);
  });

  it('GET /kyc needs the KYC permission: a Manager of the hotel may not read it', async () => {
    const res = await register({ details, owner });
    expect((await srv.get('/api/v1/kyc')).status).toBe(401);
    const orgId = (await srv.get('/api/v1/me', auth(res.body.accessToken))).body.currentOrgId;
    const manager = await createUserRepository({ bcryptCost: 4, clock }).create({
      email: 'manager@seaview.in',
      name: 'Manager',
      password: PASSWORD,
    });
    await createOrganizationsService({ clock }).addMember({ orgId, userId: manager.id, roles: ['hotel.manager'], addedBy: 's' });
    const login = await srv.post('/api/v1/auth/login', { identifier: 'manager@seaview.in', password: PASSWORD }, H);
    expect((await srv.get('/api/v1/kyc', auth(login.body.accessToken))).status).toBe(403);
  });
});
