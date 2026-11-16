// @ts-check
/** Visibility and the public hotel content (S03-T09): only LIVE listings, per channel, sell-from date, client categories. */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { isVisible, PropertyRecord, RoomTypeRecord, seedMasters } from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { completeProperty } from './helpers/hotel-listing.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'content', 'test', 'secret', 'long-enough-12345'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') }; // 15:30 in India
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const HOTELS = { 'x-staff': 'h1:hotel-catalog.listing.read,hotel-catalog.listing.review' };

describe('who may see a listing', () => {
  const live = { status: 'LIVE', visibility: { website: true, b2b: true, clientCategories: [], sellFrom: null } };
  const today = '2026-11-16';
  it('LIVE only, per channel, from the sell-from date, client categories for B2B', () => {
    expect(isVisible(live, { channel: 'WEBSITE', today })).toBe(true);
    expect(isVisible({ ...live, status: 'SUSPENDED' }, { channel: 'WEBSITE', today })).toBe(false);
    expect(isVisible({ ...live, visibility: { ...live.visibility, website: false } }, { channel: 'WEBSITE', today })).toBe(false);
    expect(isVisible({ ...live, visibility: { ...live.visibility, website: false } }, { channel: 'B2B', today })).toBe(true);
    expect(isVisible({ ...live, visibility: { ...live.visibility, sellFrom: '2026-11-17' } }, { channel: 'WEBSITE', today })).toBe(false);
    expect(isVisible({ ...live, visibility: { ...live.visibility, sellFrom: '2026-11-16' } }, { channel: 'WEBSITE', today })).toBe(true);
    const corporate = { ...live, visibility: { ...live.visibility, clientCategories: ['corporate'] } };
    expect(isVisible(corporate, { channel: 'B2B', today, clientCategory: null })).toBe(false);
    expect(isVisible(corporate, { channel: 'B2B', today, clientCategory: 'corporate' })).toBe(true);
    expect(isVisible(corporate, { channel: 'WEBSITE', today })).toBe(true);
  });
});

describe('public content', () => {
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
    dir = await mkdtemp(path.join(tmpdir(), 'b2b-content-'));
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
  /** @param {string} email */
  const login = async (email) =>
    (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, { 'x-b2b-auth': '1' })).body.accessToken;
  /** A complete listing approved by MusafirBaba (LIVE), plus a signed-in B2B client. */
  async function liveListing() {
    const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
    const orgId = (
      await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    const token = await login('owner@seaview.in');
    const id = (await srv.post('/api/v1/hotel/properties', { name: 'Sea View', propertyTypeKey: 'hotel' }, auth(token))).body.id;
    await completeProperty(srv, auth(token), id, cities.mumbai);
    let p = (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body;
    p = (await srv.post(`/api/v1/hotel/properties/${id}/submit`, {}, { ...auth(token), 'if-match': `"${p.version}"` })).body;
    expect((await admin.post(`/api/v1/admin/properties/${id}/approve`, {}, HOTELS)).body.property.status).toBe('LIVE');
    const agent = await users.create({ email: 'agent@acme.in', name: 'Agent', password: PASSWORD });
    await orgs.createOrganization({ type: 'CLIENT', legalName: 'Acme Travels', ownerUserId: agent.id, status: 'ACTIVE', createdBy: 's' });
    return { token, orgId, id, ref: p.publicRef, slug: p.slug, client: await login('agent@acme.in') };
  }
  /** @param {string} token @param {string} id @param {Record<string, unknown>} body */
  const setVisibility = async (token, id, body) => {
    const v = (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body.version;
    return srv.put(`/api/v1/hotel/properties/${id}/visibility`, body, { ...auth(token), 'if-match': `"${v}"` });
  };

  it('a live listing by reference or slug: names instead of keys, photos with addresses, room types — and nothing private', async () => {
    const { ref, slug } = await liveListing();
    const res = await srv.get(`/api/v1/hotels/${ref.toLowerCase()}`);
    expect([res.status, res.headers.get('cache-control')]).toEqual([200, 'public, max-age=60']);
    expect(res.body).toMatchObject({
      publicRef: ref,
      name: 'Sea View',
      type: { key: 'hotel', name: 'Hotel' },
      address: { line1: '12 Marine Drive', city: 'Mumbai', state: 'Maharashtra', pin: '400020' },
      checkInTime: '14:00',
      amenities: [{ key: 'wifi', name: 'Free Wi-Fi', group: 'Basics', icon: 'wifi' }],
    });
    expect(res.body.photos).toHaveLength(5);
    expect(res.body.photos[0].sizes.gallery.url).toMatch(/^http:\/\/localhost:8000\/api\/v1\/media\/b2b-public\/hotels\//);
    expect(res.body.roomTypes).toMatchObject([{ name: 'Deluxe', beds: [{ name: 'King bed', count: 1 }], maxOccupancy: 3 }]);
    expect(res.body.roomTypes[0].photos).toHaveLength(2);
    const text = JSON.stringify(res.body);
    for (const secret of ['hotelOrgId', 'stay@seaview.in', '+919876543210', 'history', 'gstin', 'createdBy'])
      expect(text).not.toContain(secret);
    expect((await srv.get(`/api/v1/hotels/${slug}`)).body.publicRef).toBe(ref);
    expect((await srv.get('/api/v1/hotels/MBHT-000000')).status).toBe(404);
  });

  it('website / B2B switches, the sell-from date in the hotel’s own time zone, suspension', async () => {
    const { token, id, ref, client } = await liveListing();
    expect((await setVisibility(token, id, { website: false, b2b: true, sellFrom: null })).body.visibility).toMatchObject({
      website: false,
      b2b: true,
    });
    expect((await srv.get(`/api/v1/hotels/${ref}`)).status).toBe(404); // website visitor
    const b2b = await srv.get(`/api/v1/hotels/${ref}`, auth(client));
    expect([b2b.status, b2b.headers.get('cache-control')]).toEqual([200, 'private, no-store']);

    await setVisibility(token, id, { website: true, b2b: false, sellFrom: '2026-11-17' });
    expect((await srv.get(`/api/v1/hotels/${ref}`, auth(client))).status).toBe(404);
    expect((await srv.get(`/api/v1/hotels/${ref}`)).status).toBe(404); // not before tomorrow
    await setVisibility(token, id, { website: true, b2b: false, sellFrom: '2026-11-16' }); // today in India
    expect((await srv.get(`/api/v1/hotels/${ref}`)).status).toBe(200);

    await admin.post(`/api/v1/admin/properties/${id}/suspend`, { note: 'Under review' }, HOTELS);
    expect((await srv.get(`/api/v1/hotels/${ref}`)).status).toBe(404);
  });

  it('client categories are MusafirBaba’s; staff can preview either channel; changes on a live listing tell search', async () => {
    const { token, orgId, id, ref, client } = await liveListing();
    expect((await setVisibility(token, id, { website: true, b2b: true, sellFrom: null, clientCategories: ['corporate'] })).status).toBe(
      400,
    );
    const v = (await admin.get(`/api/v1/admin/properties/${id}`, HOTELS)).body.property.version;
    const set = await admin.put(
      `/api/v1/admin/properties/${id}/visibility`,
      { website: false, b2b: true, sellFrom: null, clientCategories: ['corporate'] },
      { ...HOTELS, 'if-match': `"${v}"` },
    );
    expect(set.body.visibility.clientCategories).toEqual(['corporate']);
    expect((await srv.get(`/api/v1/hotels/${ref}`, auth(client))).status).toBe(404); // this client has no category yet
    expect((await admin.get(`/api/v1/hotels/${ref}`, HOTELS)).status).toBe(404); // website preview: website is off
    expect((await admin.get(`/api/v1/hotels/${ref}?channel=B2B`, HOTELS)).status).toBe(404); // categories apply to staff preview too
    const events = (await PropertyRecord.findOne({ _id: id, hotelOrgId: orgId }).lean())?.pendingEvents?.map((e) => [
      e.type,
      e.payload.fields?.join(',') ?? null,
    ]);
    expect(events?.at(-1)).toEqual(['hotel-catalog.property.updated', 'visibility']);
  });
});
