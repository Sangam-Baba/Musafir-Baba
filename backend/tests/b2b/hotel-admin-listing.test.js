// @ts-check
/**
 * MusafirBaba's listing tools (S03-T08): queue, detail with checklist and duplicates, approve / request changes /
 * suspend / reactivate / archive, direct edits, never your own organisation.
 */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { namesSimilar, PropertyRecord, RoomTypeRecord, seedMasters } from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { completeProperty } from './helpers/hotel-listing.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'admin', 'listing', 'test', 'secret', 'long-1'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const HOTELS = { 'x-staff': 'h1:hotel-catalog.listing.read,hotel-catalog.listing.review' };
const SUPPORT = { 'x-staff': 's1:hotel-catalog.listing.read' };

describe('possible duplicates', () => {
  it('same or close names, ignoring common words', () => {
    expect(namesSimilar('Sea View Hotel', 'The Sea View')).toBe(true);
    expect(namesSimilar('Hotel Taj Palace', 'Taj Palace Resort & Spa')).toBe(true);
    expect(namesSimilar('Sea View', 'Hill Top')).toBe(false);
    expect(namesSimilar('Grand Hotel', 'Grand Inn')).toBe(false);
  });
});

describe('listing tools', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let admin;
  let dir = '';
  /** @type {Record<string, any>} */
  let cities = {};
  const users = createUserRepository({ bcryptCost: 4, clock });
  const orgs = createOrganizationsService({ clock });

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    await seedMasters();
    dir = await mkdtemp(path.join(tmpdir(), 'b2b-admin-listing-'));
    const env = { B2B_AUTH_SECRET: SECRET, B2B_FILE_DIR: dir };
    const logger = createLogger({ write: () => {} });
    const app = express();
    app.use('/api/v1', createB2BRouter({ connect: false, logger, clock, env }));
    srv = await startServer(app);
    const staffApp = express();
    staffApp.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger,
        clock,
        env,
        authenticate: async (req) => {
          const [staffId, perms] = String(req.get('x-staff') ?? '').split(':');
          return staffId ? { type: 'staff', staffId, permissions: (perms ?? '').split(',') } : null;
        },
      }),
    );
    admin = await startServer(staffApp);
    cities = Object.fromEntries((await srv.get('/api/v1/catalog/masters')).body.cities.map((/** @type {any} */ c) => [c.slug, c]));
  });
  afterAll(async () => {
    await srv.close();
    await admin.close();
    await rm(dir, { recursive: true, force: true });
    await mongo.stop();
  });
  beforeEach(async () => {
    await Promise.all([
      UserRecord.deleteMany({}),
      OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
      MemberRecord.deleteMany({}).setOptions(SYSTEM),
      PropertyRecord.deleteMany({}).setOptions(SYSTEM),
      RoomTypeRecord.deleteMany({}).setOptions(SYSTEM),
      mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
      mongo.db.collection('staffs').deleteMany({}),
    ]);
  });

  /** @param {string} t */
  const auth = (t) => ({ authorization: `Bearer ${t}` });
  /** A verified hotel with a complete, submitted property. @param {string} email @param {string} [name] */
  async function submitted(email, name = 'Sea View') {
    const owner = await users.create({ email, name: 'Owner', password: PASSWORD });
    const orgId = (
      await orgs.createOrganization({ type: 'HOTEL', legalName: name, ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    const token = (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, { 'x-b2b-auth': '1' })).body.accessToken;
    const id = (await srv.post('/api/v1/hotel/properties', { name, propertyTypeKey: 'hotel' }, auth(token))).body.id;
    const { version } = await completeProperty(srv, auth(token), id, cities.mumbai);
    if (name !== 'Sea View') {
      const v = (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body.version;
      await srv.put(
        `/api/v1/hotel/properties/${id}/sections/basic`,
        {
          name,
          propertyTypeKey: 'hotel',
          starRating: 3,
          description: 'A calm sea-facing hotel on Marine Drive with rooms that look over the bay and a rooftop restaurant.',
        },
        { ...auth(token), 'if-match': `"${v}"` },
      );
    }
    const v = (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body.version;
    const s = await srv.post(`/api/v1/hotel/properties/${id}/submit`, {}, { ...auth(token), 'if-match': `"${v}"` });
    expect(s.body.status).toBe('SUBMITTED');
    void version;
    return { token, orgId, id };
  }
  /** @param {string} id @param {string} action @param {Record<string, unknown>} [body] @param {Record<string, string>} [who] */
  const act = (id, action, body = {}, who = HOTELS) => admin.post(`/api/v1/admin/properties/${id}/${action}`, body, who);
  /** @param {string} orgId @param {string} id */
  const eventsOf = async (orgId, id) =>
    ((await PropertyRecord.findOne({ _id: id, hotelOrgId: orgId }).lean())?.pendingEvents ?? []).map((e) => e.type);

  it('the queue lists submitted listings oldest first; Support reads but cannot decide', async () => {
    const a = await submitted('owner@seaview.in');
    const queue = (await admin.get('/api/v1/admin/properties?queue=true', SUPPORT)).body.data;
    expect(queue).toMatchObject([{ id: a.id, status: 'SUBMITTED', city: 'Mumbai', round: 1, hasPendingRevision: false }]);
    expect(queue[0].coverUrl).toMatch(/^http:\/\/localhost:8000\/api\/v1\/media\/b2b-public\/hotels\/.+-thumb\.webp$/);
    expect((await admin.get('/api/v1/admin/properties?q=sea', SUPPORT)).body.data).toHaveLength(1);
    expect((await act(a.id, 'approve', {}, SUPPORT)).status).toBe(403);
  });

  it('detail shows the checklist and a possible duplicate of another hotel 100 m away', async () => {
    const a = await submitted('owner@seaview.in');
    const b = await submitted('owner@theseaview.in', 'The Sea View Hotel');
    const detail = (await admin.get(`/api/v1/admin/properties/${b.id}`, HOTELS)).body;
    expect(detail.organisation).toMatchObject({ name: 'The Sea View Hotel', status: 'ACTIVE' });
    expect(detail.roomTypes).toHaveLength(1);
    expect(detail.checklist.blockers).toEqual([]);
    expect(detail.checklist.duplicates).toEqual([
      { id: a.id, publicRef: expect.any(String), name: 'Sea View', status: 'SUBMITTED', sameOrganisation: false, distanceM: 0 },
    ]);
  });

  it('approve → LIVE and published (first time); request changes needs comments, the hotel sees them and resubmits', async () => {
    const a = await submitted('owner@seaview.in');
    expect((await act(a.id, 'request-changes', {})).body.code).toBe('COMMENTS_REQUIRED');
    const back = await act(a.id, 'request-changes', { comments: [{ section: 'photos', note: 'The lobby photo is blurry' }] });
    expect(back.body.property).toMatchObject({
      status: 'CHANGES_REQUESTED',
      review: { comments: [{ section: 'photos', note: 'The lobby photo is blurry' }] },
    });
    const seen = (await srv.get(`/api/v1/hotel/properties/${a.id}`, auth(a.token))).body;
    expect(seen.review.comments[0].note).toBe('The lobby photo is blurry');
    const resubmit = await srv.post(`/api/v1/hotel/properties/${a.id}/submit`, {}, { ...auth(a.token), 'if-match': `"${seen.version}"` });
    expect([resubmit.body.status, resubmit.body.round]).toEqual(['SUBMITTED', 2]);

    const live = await act(a.id, 'approve', { note: 'All good' });
    expect(live.body.property).toMatchObject({ status: 'LIVE', publishedAt: '2026-11-16T10:00:00.000Z' });
    expect(await eventsOf(a.orgId, a.id)).toEqual([
      'hotel-catalog.property.submitted',
      'hotel-catalog.property.changes-requested',
      'hotel-catalog.property.submitted',
      'hotel-catalog.property.published',
    ]);
  });

  it('suspend (reason) → off; reactivate → published again; archive; a suspended hotel company cannot be approved', async () => {
    const a = await submitted('owner@seaview.in');
    await act(a.id, 'approve');
    expect((await act(a.id, 'suspend', {})).body.code).toBe('REASON_REQUIRED');
    expect((await act(a.id, 'suspend', { note: 'Guest complaints under review' })).body.property.status).toBe('SUSPENDED');
    expect((await act(a.id, 'reactivate')).body.property.status).toBe('LIVE');
    expect((await eventsOf(a.orgId, a.id)).slice(-3)).toEqual([
      'hotel-catalog.property.published',
      'hotel-catalog.property.suspended',
      'hotel-catalog.property.published',
    ]);
    expect((await act(a.id, 'archive', { note: 'Hotel closed' })).body.property.status).toBe('ARCHIVED');
    expect((await act(a.id, 'reactivate')).body.code).toBe('LISTING_TRANSITION_NOT_ALLOWED');

    const b = await submitted('owner@hill.in', 'Hill Top Manali');
    await OrganizationRecord.updateOne({ _id: b.orgId }, { $set: { status: 'SUSPENDED' } });
    expect((await act(b.id, 'approve')).body.code).toBe('BUSINESS_NOT_ACTIVE');
  });

  it('MusafirBaba edits directly (no revision, update event); never decides its own organisation', async () => {
    const a = await submitted('owner@seaview.in');
    await act(a.id, 'approve');
    const v = (await admin.get(`/api/v1/admin/properties/${a.id}`, HOTELS)).body.property.version;
    const body = {
      name: 'Sea View (Marine Drive)',
      propertyTypeKey: 'hotel',
      starRating: 4,
      description: 'A calm sea-facing hotel on Marine Drive with rooms that look over the bay and a rooftop restaurant.',
    };
    const edited = await admin.put(`/api/v1/admin/properties/${a.id}/sections/basic`, body, { ...HOTELS, 'if-match': `"${v}"` });
    expect(edited.body).toMatchObject({ name: 'Sea View (Marine Drive)', starRating: 4, pendingRevision: null, status: 'LIVE' });
    expect((await admin.put(`/api/v1/admin/properties/${a.id}/sections/basic`, body, { ...HOTELS, 'if-match': `"${v}"` })).status).toBe(
      412,
    );
    expect((await eventsOf(a.orgId, a.id)).at(-1)).toBe('hotel-catalog.property.updated');

    const b = await submitted('staffer@musafirbaba.com', 'Staff Family Hotel');
    const staffId = new ObjectId();
    await mongo.db
      .collection('staffs')
      .insertOne({ _id: staffId, name: 'Staffer', email: 'staffer@musafirbaba.com', role: 'admin', isActive: true });
    const own = await act(
      b.id,
      'approve',
      {},
      { 'x-staff': `${staffId.toHexString()}:hotel-catalog.listing.read,hotel-catalog.listing.review` },
    );
    expect([own.status, own.body.code]).toEqual([403, 'LISTING_OWN_ORGANISATION']);
  });
});
