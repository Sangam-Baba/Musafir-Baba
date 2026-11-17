// @ts-check
/** Unfinished hotel registrations (S02-T11): one reminder after 30 days, removal after 90; repeat-safe; never an active org. */
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createKycRetention, PURGE_REASON } from '../../src/b2b/flows/kyc-retention.js';
import { createFilesService, createLocalStore } from '../../src/b2b/modules/files/index.js';
import { createSessionService, createUserRepository, SessionRecord, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord, createKycService, validateHotelDetails } from '../../src/b2b/modules/kyc/index.js';
import { renderTemplate } from '../../src/b2b/modules/notifications/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'retention', 'test', 'secret', 'long-enough-12345'].join('-');
const NOW = new Date('2026-11-15T10:00:00Z');
const clock = { now: () => NOW };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const DAY = 24 * 60 * 60_000;
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF', 'latin1');
const details = validateHotelDetails({
  legalName: 'Sea View Hotels',
  contactName: 'Asha',
  mobile: '9876543210',
  email: 'owner@seaview.in',
  gstRegistered: false,
  pan: 'AAPFU0939F',
  address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
  propertyCount: 1,
  termsAccepted: true,
  termsVersion: '2026-11',
});

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let dir = '';
/** @type {ReturnType<typeof createFilesService>} */
let files;
/** @type {ReturnType<typeof createKycRetention>} */
let retention;
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });
const kyc = createKycService({ clock, fieldKey: SECRET });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-retention-'));
  files = createFilesService({ store: createLocalStore(dir), masterKey: SECRET, clock });
  retention = createKycRetention({
    clock,
    logger: createLogger({ write: () => {} }),
    files,
    secret: SECRET,
    remindAfterDays: 30,
    purgeAfterDays: 90,
  });
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    UserRecord.deleteMany({}),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    ApplicationRecord.deleteMany({}).setOptions(SYSTEM),
    SessionRecord.deleteMany({}).setOptions(SYSTEM),
  ]);
});

let n = 0;
/** A hotel that started registering `daysAgo` days ago (with one uploaded document and an open session). @param {number} daysAgo */
async function startedHotel(daysAgo, status = 'DRAFT') {
  n += 1;
  const owner = await users.create({ email: `owner${n}@seaview.in`, name: 'Owner', password: 'correct-horse-battery' });
  const orgId = (await orgs.createOrganization({ type: 'HOTEL', legalName: `Hotel ${n}`, ownerUserId: owner.id, createdBy: 's' })).id;
  await kyc.ensureApplication({ orgId, orgType: 'HOTEL', createdBy: owner.id, details });
  await mongo.db
    .collection('kyc_applications')
    .updateOne({ orgId }, { $set: { createdAt: new Date(NOW.getTime() - daysAgo * DAY), status } });
  await files.store({ orgId, purpose: 'kyc-document', uploadedBy: owner.id, bytes: PDF });
  await createSessionService({ secret: SECRET, clock }).create({ userId: owner.id, orgId, methods: ['password'] });
  return { orgId, ownerId: owner.id };
}

/** @param {string} orgId */
const appOf = async (orgId) => /** @type {any} */ (await ApplicationRecord.findOne({ orgId }).lean());
/** @param {string} orgId */
const orgOf = async (orgId) => /** @type {any} */ (await OrganizationRecord.findOne({ _id: orgId }).lean());

describe('reminder', () => {
  it('once, only for drafts older than 30 days', async () => {
    const old = await startedHotel(31);
    const fresh = await startedHotel(10);
    const submitted = await startedHotel(40, 'SUBMITTED');
    expect(await retention.runOnce()).toEqual({ reminded: 1, purged: 0 });
    expect(await retention.runOnce()).toEqual({ reminded: 0, purged: 0 });
    expect((await appOf(old.orgId)).pendingEvents.map((/** @type {any} */ e) => e.type)).toEqual(['kyc.application.reminded']);
    for (const other of [fresh, submitted]) expect((await appOf(other.orgId)).remindedAt).toBeNull();
    expect(renderTemplate('kyc.reminder', { orgName: 'Hotel 1', link: 'https://musafirbaba.com/business/verification' }).subject).toBe(
      'Finish registering your business — MusafirBaba Business',
    );
  });
});

describe('removal after 90 days', () => {
  it('closes the org, ends memberships and sessions, deletes documents and the draft; keeps the user account', async () => {
    const { orgId, ownerId } = await startedHotel(91);
    const keep = await startedHotel(60);
    const before = (await readdir(dir)).length;
    expect((await retention.runOnce()).purged).toBe(1);

    const org = await orgOf(orgId);
    expect([org.status, org.statusReason]).toEqual(['CLOSED', PURGE_REASON]);
    expect(org.pendingEvents.map((/** @type {any} */ e) => e.type)).toContain('organizations.org.closed');
    expect((await MemberRecord.findOne({ orgId, userId: ownerId }).lean())?.status).toBe('REMOVED');
    expect((await SessionRecord.findOne({ userId: ownerId }).lean())?.revokedAt).toBeTruthy();
    expect(await appOf(orgId)).toBeNull(); // sealed PAN / bank number gone with it
    expect((await readdir(dir)).length).toBe(before - 1);
    expect(await UserRecord.countDocuments({ _id: ownerId })).toBe(1);
    expect((await orgOf(keep.orgId)).status).toBe('ONBOARDING');
    expect(await retention.runOnce()).toEqual({ reminded: 0, purged: 0 });
  });

  it('an interrupted removal is finished on the next run', async () => {
    const { orgId } = await startedHotel(91);
    await orgs.closeUnfinished({ orgId, reason: PURGE_REASON }); // crashed after this step
    expect((await retention.runOnce()).purged).toBe(1);
    expect(await appOf(orgId)).toBeNull();
  });

  it('never touches an org that is no longer onboarding', async () => {
    const { orgId } = await startedHotel(120);
    await OrganizationRecord.updateOne({ _id: orgId }, { $set: { status: 'SUSPENDED' } });
    const before = (await readdir(dir)).length;
    expect((await retention.runOnce()).purged).toBe(0);
    expect(await appOf(orgId)).not.toBeNull();
    expect((await readdir(dir)).length).toBe(before);
    expect((await orgOf(orgId)).status).toBe('SUSPENDED');
  });
});
