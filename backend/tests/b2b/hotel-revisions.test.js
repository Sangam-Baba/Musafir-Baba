// @ts-check
/**
 * Edits to a live listing (S03-T07): sensitive fields wait in a pending revision while the listing stays live;
 * everything else is published at once; MusafirBaba approves / rejects the revision it saw; room types and photos.
 */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { PropertyRecord, RoomTypeRecord, seedMasters, splitChanges } from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { completeProperty, LONG_DESCRIPTION } from './helpers/hotel-listing.js';
import { startServer } from './helpers/http.js';
import { uploadPhoto } from './helpers/images.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'revisions', 'test', 'secret', 'long-enough-12'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const HOTELS = { 'x-staff': 'h1:hotel-catalog.listing.read,hotel-catalog.listing.review' };

describe('which edits wait for approval', () => {
  it('only changed sensitive fields; the rest is published directly', () => {
    const current = {
      name: 'Sea View',
      starRating: 3,
      description: 'old',
      propertyTypeKey: 'hotel',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      timeZone: 'Asia/Kolkata',
    };
    expect(splitChanges('basic', { name: 'Sea View', starRating: 4, description: 'new', propertyTypeKey: 'hotel' }, current)).toEqual({
      direct: { description: 'new' },
      sensitive: { starRating: 4 },
    });
    expect(splitChanges('times', { checkInTime: '12:00', checkOutTime: '10:00', timeZone: 'Asia/Kolkata' }, current)).toEqual({
      direct: { checkOutTime: '10:00' },
      sensitive: { checkInTime: '12:00' },
    });
    expect(splitChanges('amenities', { amenities: ['wifi'] }, { amenities: ['wifi'] })).toEqual({ direct: {}, sensitive: {} });
  });
});

describe('a live listing', () => {
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
    dir = await mkdtemp(path.join(tmpdir(), 'b2b-revisions-'));
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
    ]);
  });

  /** @param {string} t */
  const auth = (t) => ({ authorization: `Bearer ${t}` });
  /** A verified hotel with a complete property that is LIVE. */
  async function liveListing() {
    const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
    const orgId = (
      await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    const token = (await srv.post('/api/v1/auth/login', { identifier: 'owner@seaview.in', password: PASSWORD }, { 'x-b2b-auth': '1' })).body
      .accessToken;
    const id = (await srv.post('/api/v1/hotel/properties', { name: 'Sea View', propertyTypeKey: 'hotel' }, auth(token))).body.id;
    const { roomId } = await completeProperty(srv, auth(token), id, cities.mumbai);
    await PropertyRecord.updateOne(
      { _id: id, hotelOrgId: orgId },
      { $set: { status: 'LIVE', publishedAt: clock.now() }, $unset: { pendingEvents: '' } },
    );
    return { token, orgId, id, roomId };
  }
  /** @param {string} token @param {string} id */
  const get = async (token, id) => (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body;
  /** @param {string} token @param {string} id @param {string} section @param {unknown} body */
  const save = async (token, id, section, body) =>
    srv.put(`/api/v1/hotel/properties/${id}/sections/${section}`, body, {
      ...auth(token),
      'if-match': `"${(await get(token, id)).version}"`,
    });
  /** @param {string} orgId @param {string} id */
  const eventsOf = async (orgId, id) =>
    ((await PropertyRecord.findOne({ _id: id, hotelOrgId: orgId }).lean())?.pendingEvents ?? []).map((e) => [
      e.type,
      e.payload.decision ?? e.payload.fields?.join(','),
    ]);

  it('a new name waits for approval (still live, old name shown); the new description is published at once', async () => {
    const { token, orgId, id } = await liveListing();
    const res = await save(token, id, 'basic', {
      name: 'Sea View Grand',
      propertyTypeKey: 'hotel',
      starRating: 3,
      description: `${LONG_DESCRIPTION} Now with a spa.`,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'LIVE',
      name: 'Sea View',
      description: `${LONG_DESCRIPTION} Now with a spa.`,
      pendingRevision: { changes: { name: 'Sea View Grand' } },
    });
    expect(await eventsOf(orgId, id)).toEqual([
      ['hotel-catalog.property.updated', 'description'],
      ['hotel-catalog.revision.submitted', 'name'],
    ]);
  });

  it('more sensitive edits join the same revision; approving needs the latest one; then they go live', async () => {
    const { token, orgId, id } = await liveListing();
    await save(token, id, 'basic', { name: 'Sea View Grand', propertyTypeKey: 'hotel', starRating: 3, description: LONG_DESCRIPTION });
    const first = (await get(token, id)).pendingRevision.revisionId;
    await save(token, id, 'times', { checkInTime: '12:00', checkOutTime: '11:00', timeZone: 'Asia/Kolkata' });
    const pending = (await get(token, id)).pendingRevision;
    expect(pending.changes).toEqual({ name: 'Sea View Grand', checkInTime: '12:00' });

    const url = `/api/v1/admin/properties/${id}/revision/decision`;
    expect((await admin.post(url, { revisionId: first, decision: 'APPROVE' }, HOTELS)).body.code).toBe('REVISION_CHANGED'); // edits were added after it was opened
    expect(
      (await admin.post(url, { revisionId: pending.revisionId, decision: 'APPROVE' }, { 'x-staff': 's1:hotel-catalog.listing.read' }))
        .status,
    ).toBe(403);
    const approved = await admin.post(
      url,
      { revisionId: pending.revisionId, decision: 'APPROVE', note: 'Name matches the GST certificate' },
      HOTELS,
    );
    expect(approved.body).toMatchObject({ status: 'LIVE', name: 'Sea View Grand', checkInTime: '12:00', pendingRevision: null });
    expect((await eventsOf(orgId, id)).slice(-2)).toEqual([
      ['hotel-catalog.revision.decided', 'APPROVED'],
      ['hotel-catalog.property.updated', 'name,checkInTime'],
    ]);
    expect(approved.body.history.at(-1)).toMatchObject({ action: 'revision-approved', note: 'Name matches the GST certificate' });
  });

  it('rejecting needs a note and keeps the live values; the hotel can also take its changes back', async () => {
    const { token, id } = await liveListing();
    await save(token, id, 'location', {
      cityId: cities.mumbai.id,
      line1: '99 New Road',
      pin: '400021',
      lat: cities.mumbai.lat + 0.02,
      lng: cities.mumbai.lng,
    });
    const pending = (await get(token, id)).pendingRevision;
    expect(pending.changes).toMatchObject({ address: { line1: '99 New Road' }, lat: cities.mumbai.lat + 0.02 });
    const url = `/api/v1/admin/properties/${id}/revision/decision`;
    expect((await admin.post(url, { revisionId: pending.revisionId, decision: 'REJECT' }, HOTELS)).body.code).toBe(
      'REVISION_NOTE_REQUIRED',
    );
    const rejected = await admin.post(url, { revisionId: pending.revisionId, decision: 'REJECT', note: 'Pin is on the beach' }, HOTELS);
    expect(rejected.body).toMatchObject({ pendingRevision: null, address: { line1: '12 Marine Drive' } });

    await save(token, id, 'basic', { name: 'Another Name', propertyTypeKey: 'hotel', starRating: 3, description: LONG_DESCRIPTION });
    const v = (await get(token, id)).version;
    const cancelled = await srv.del(`/api/v1/hotel/properties/${id}/revision`, { ...auth(token), 'if-match': `"${v}"` });
    expect([cancelled.status, cancelled.body.pendingRevision, cancelled.body.name]).toEqual([200, null, 'Sea View']);
  });

  it('room types and photos change directly (with an update event) but a live listing stays complete', async () => {
    const { token, orgId, id, roomId } = await liveListing();
    const suite = await srv.post(
      `/api/v1/hotel/properties/${id}/room-types`,
      {
        name: 'Suite',
        description: '',
        sizeSqm: 50,
        beds: [{ bedTypeKey: 'king', count: 1 }],
        maxAdults: 2,
        maxChildren: 2,
        maxOccupancy: 4,
        extraBeds: { allowed: false, max: 0 },
        amenities: [],
      },
      auth(token),
    );
    expect(suite.status).toBe(201);
    const suiteDoc = await RoomTypeRecord.findOne({ _id: suite.body.id, hotelOrgId: orgId }).lean();
    expect(suiteDoc?.pendingEvents?.map((e) => e.type)).toEqual(['hotel-catalog.property.updated']);
    expect((await srv.del(`/api/v1/hotel/properties/${id}/room-types/${suite.body.id}`, auth(token))).status).toBe(204);
    expect((await RoomTypeRecord.findOne({ _id: suite.body.id, hotelOrgId: orgId }).lean())?.status).toBe('ARCHIVED'); // published listing: archived, not deleted
    expect((await srv.del(`/api/v1/hotel/properties/${id}/room-types/${roomId}`, auth(token))).body.code).toBe('LAST_ROOM_TYPE');

    expect((await uploadPhoto(srv.base, auth(token), id, { fields: { category: 'POOL' } })).status).toBe(201);
    const photos = (await get(token, id)).photos.filter((/** @type {any} */ p) => !p.roomTypeId);
    expect((await srv.del(`/api/v1/hotel/properties/${id}/photos/${photos[0].id}`, auth(token))).status).toBe(204); // 6 → 5
    expect((await srv.del(`/api/v1/hotel/properties/${id}/photos/${photos[1].id}`, auth(token))).body.code).toBe('PHOTOS_BELOW_MINIMUM');
    expect((await eventsOf(orgId, id)).filter(([t]) => t === 'hotel-catalog.property.updated')).toHaveLength(2);
  });
});
