// @ts-check
/**
 * Stage 02 mandatory tests (plan Stage 02 §9). This file holds what was not covered elsewhere:
 * tenant isolation for every Stage 02 collection, and crash injection for hotel registration.
 * The rest of the list lives in:
 * - upload safety → files.test.js (type from content, size, unsafe PDFs, encryption, R2 private folder);
 *   files-access.test.js (60-second links, access log)
 * - KYC state machine (all transitions) and idempotent submit → kyc-application.test.js
 * - maker–checker, own-organisation guard, lock expiry → kyc-review.test.js
 * - document set per org type (a second type through configuration only) → kyc-domain.test.js
 * - sensitive fields encrypted and masked → kyc-sensitive.test.js
 * - notifications: inbox idempotency, catch-up (`after`), permission filter, critical lock, ids-only pushes
 *   → notifications.test.js; room security → realtime.test.js
 * - retention (repeat-safe purge, interrupted purge finishes) → kyc-retention.test.js
 * - approval → org active, repeat delivery → kyc-review.test.js ("after the decision")
 */
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { FileAccessRecord, FileRecord } from '../../src/b2b/modules/files/index.js';
import { createUserRepository } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { InboxRecord, PreferenceRecord } from '../../src/b2b/modules/notifications/index.js';
import { createOrganizationsService, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const SECRET = ['b2b', 'stage02', 'mandatory', 'secret', 'long-enough-1'].join('-');
const A = '64b0000000000000000000aa';
const B = '64b0000000000000000000bb';

/**
 * Every Stage 02 collection owned by an org or a user: the model, its owner field, and a valid document.
 * @type {[string, import('mongoose').Model<any>, string, (owner: string) => Record<string, unknown>][]}
 */
const OWNED = [
  [
    'file_files',
    FileRecord,
    'orgId',
    (o) => ({
      orgId: o,
      purpose: 'kyc-document',
      originalName: 'a.pdf',
      contentType: 'application/pdf',
      size: 1,
      sha256: `s-${o}`,
      storageKey: `k-${o}`,
      wrappedKey: 'w',
      uploadedBy: 'u',
    }),
  ],
  [
    'file_access_log',
    FileAccessRecord,
    'orgId',
    (o) => ({ orgId: o, fileId: `f-${o}`, action: 'downloaded', viewer: 'staff:s', at: clock.now() }),
  ],
  ['kyc_applications', ApplicationRecord, 'orgId', (o) => ({ orgId: o, orgType: 'HOTEL', createdBy: 'u' })],
  [
    'ntf_inbox',
    InboxRecord,
    'recipientId',
    (o) => ({ eventId: `e-${o}`, recipientType: 'ORG', recipientId: o, category: 'kyc.approved', title: 't' }),
  ],
  ['ntf_preferences', PreferenceRecord, 'userId', (o) => ({ userId: o, category: 'team.role-changed' })],
];

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  for (const [, model, , doc] of OWNED) await model.insertMany([doc(A), doc(B)]);
});
afterAll(async () => mongo.stop());

describe('tenant isolation — every Stage 02 owned collection', () => {
  it.each(OWNED)('%s: unscoped reads and writes are refused', async (_name, model) => {
    await expect(model.find({}).lean()).rejects.toThrow(/no ownership filter/);
    await expect(model.countDocuments({})).rejects.toThrow(/no ownership filter/);
    await expect(model.updateMany({}, { $set: { updatedAt: new Date() } })).rejects.toThrow(/no ownership filter/);
    await expect(model.deleteMany({})).rejects.toThrow(/no ownership filter/);
  });

  it.each(OWNED)("%s: a scoped query sees only that owner's documents", async (_name, model, field) => {
    const docs = await model.find({ [field]: A }).lean();
    expect(docs.length).toBeGreaterThan(0);
    for (const d of docs) expect(String(/** @type {any} */ (d)[field])).toBe(A);
  });

  it('every Stage 02 collection (file_, kyc_, ntf_) is classified here', () => {
    const classified = new Set(OWNED.map(([name]) => name));
    const stage02 = Object.values(b2bMongoose.models)
      .map((m) => m.collection.collectionName)
      .filter((n) => /^(file|kyc|ntf)_/.test(n));
    expect(stage02.filter((n) => !classified.has(n))).toEqual([]);
    expect(stage02.length).toBe(OWNED.length);
  });
});

describe('hotel registration — interrupted between steps (no transaction)', () => {
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  const users = createUserRepository({ bcryptCost: 4, clock });
  const orgs = createOrganizationsService({ clock });
  const H = { 'x-b2b-auth': '1' };
  const details = {
    legalName: 'Sea View Hotels',
    contactName: 'Asha',
    mobile: '9876543210',
    email: 'crash@seaview.in',
    gstRegistered: false,
    pan: 'AAPFU0939F',
    address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
    propertyCount: 1,
    termsAccepted: true,
    termsVersion: '2026-11',
  };
  beforeAll(async () => {
    const app = express();
    app.use(
      '/api/v1',
      createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: SECRET } }),
    );
    srv = await startServer(app);
  });
  afterAll(async () => srv.close());

  /** @param {string} email */
  const login = async (email) =>
    (await srv.post('/api/v1/auth/login', { identifier: email, password: 'correct-horse-battery' }, H)).body.accessToken;

  it('crash after the org was created (no application yet): opening the verification page starts an empty draft', async () => {
    const owner = await users.create({ email: 'stopped@hotel.in', name: 'Owner', password: 'correct-horse-battery' });
    const orgId = (await orgs.createOrganization({ type: 'HOTEL', legalName: 'Stopped Hotel', ownerUserId: owner.id, createdBy: 'test' }))
      .id;
    const auth = { authorization: `Bearer ${await login('stopped@hotel.in')}` };
    const kyc = await srv.get('/api/v1/kyc', auth);
    expect(kyc.status).toBe(200);
    expect(kyc.body).toMatchObject({ orgId, status: 'DRAFT', details: null, editable: true });
    expect((await srv.get('/api/v1/kyc', auth)).body.id).toBe(kyc.body.id); // once
    const saved = await srv.put('/api/v1/kyc', { details: { ...details, email: 'stopped@hotel.in' } }, auth);
    expect([saved.status, saved.body.details.legalName]).toEqual([200, 'Sea View Hotels']);
  });

  it('an active org without an application does not get one (so it is never reminded or removed)', async () => {
    const owner = await users.create({ email: 'active@hotel.in', name: 'Owner', password: 'correct-horse-battery' });
    const orgId = (
      await orgs.createOrganization({
        type: 'HOTEL',
        legalName: 'Active Hotel',
        ownerUserId: owner.id,
        status: 'ACTIVE',
        createdBy: 'test',
      })
    ).id;
    const res = await srv.get('/api/v1/kyc', { authorization: `Bearer ${await login('active@hotel.in')}` });
    expect([res.status, res.body.code]).toEqual([404, 'KYC_APPLICATION_NOT_FOUND']);
    expect(await ApplicationRecord.countDocuments({ orgId })).toBe(0);
  });

  it('crash after the account was created (no hotel yet): the person signs in and registers again', async () => {
    await users.create({ email: 'crash@seaview.in', name: 'Asha', password: 'correct-horse-battery' });
    const again = await srv.post('/api/v1/registrations/hotel', { details, owner: { name: 'Asha', password: 'correct-horse-battery' } }, H);
    expect(again.body.code).toBe('ACCOUNT_EXISTS_SIGN_IN');
    const res = await srv.post(
      '/api/v1/registrations/hotel',
      { details },
      { ...H, authorization: `Bearer ${await login('crash@seaview.in')}` },
    );
    expect(res.status).toBe(201);
    const me = (await srv.get('/api/v1/me', { authorization: `Bearer ${res.body.accessToken}` })).body;
    expect((await OrganizationRecord.findOne({ _id: me.currentOrgId }).lean())?.status).toBe('ONBOARDING');
  });
});
