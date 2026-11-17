// @ts-check
/** Hotel properties (S03-T03): wizard sections, version check, pin inside the city, GSTIN per state, property limits. */
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { PropertyRecord, seedMasters } from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'properties', 'test', 'secret', 'long-enough-12'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };
const PAN = 'AAPFU0939F';
/** @param {string} state */
const gstinFor = (state) => `${state}${PAN}1Z${gstinCheckChar(`${state}${PAN}1Z`)}`;
const LONG = 'A calm sea-facing hotel on Marine Drive with rooms that look over the bay and a rooftop restaurant.';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
/** @type {Record<string, any>} */
let cities = {};
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedMasters();
  const app = express();
  app.use(
    '/api/v1',
    createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: SECRET } }),
  );
  srv = await startServer(app);
  const m = (await srv.get('/api/v1/catalog/masters')).body;
  cities = Object.fromEntries(m.cities.map((/** @type {any} */ c) => [c.slug, c]));
});
afterAll(async () => {
  await srv.close();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    UserRecord.deleteMany({}),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    ApplicationRecord.deleteMany({}).setOptions(SYSTEM),
    PropertyRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });
/** A GST-registered hotel business (main GSTIN in Maharashtra), verified. @param {string} [email] */
async function verifiedHotel(email = 'owner@seaview.in') {
  const details = {
    legalName: 'Sea View Hotels Private Limited',
    contactName: 'Asha',
    mobile: '9876543210',
    email,
    gstRegistered: true,
    gstin: gstinFor('27'),
    pan: PAN,
    address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
    propertyCount: 2,
    termsAccepted: true,
    termsVersion: '2026-11',
  };
  const res = await srv.post('/api/v1/registrations/hotel', { details, owner: { name: 'Asha', password: PASSWORD } }, H);
  const token = res.body.accessToken;
  const orgId = (await srv.get('/api/v1/me', auth(token))).body.currentOrgId;
  await ApplicationRecord.updateOne({ orgId }, { $set: { status: 'APPROVED' } });
  return { token, orgId };
}
/** @param {string} token @param {string} [name] */
const createProperty = async (token, name = 'Sea View Marine Drive') =>
  srv.post('/api/v1/hotel/properties', { name, propertyTypeKey: 'hotel' }, auth(token));
/** @param {string} token @param {string} id @param {string} section @param {unknown} body @param {number | null} version */
const save = (token, id, section, body, version) =>
  srv.put(`/api/v1/hotel/properties/${id}/sections/${section}`, body, {
    ...auth(token),
    ...(version === null ? {} : { 'if-match': `"${version}"` }),
  });
/** @param {any} city @param {number} [dLat] */
const locationIn = (city, dLat = 0.01) => ({
  cityId: city.id,
  line1: '12 Marine Drive',
  pin: '400020',
  lat: city.lat + dLat,
  lng: city.lng,
});

describe('the wizard', () => {
  it('creates a draft and saves each section; every save needs the version it loaded', async () => {
    const { token } = await verifiedHotel();
    const made = await createProperty(token);
    expect(made.status).toBe(201);
    expect(made.headers.get('etag')).toBe('"1"');
    expect(made.body).toMatchObject({ status: 'DRAFT', version: 1, name: 'Sea View Marine Drive', timeZone: 'Asia/Kolkata' });
    expect(made.body.publicRef).toMatch(/^MBHT-[0-9A-Z]{6}$/);
    expect(made.body.slug).toMatch(/^sea-view-marine-drive-[0-9a-z]{6}$/);
    const id = made.body.id;

    const basic = { name: 'Sea View Marine Drive', propertyTypeKey: 'hotel', starRating: 4, description: `${LONG}\u0007` };
    expect((await save(token, id, 'basic', basic, null)).status).toBe(428);
    const saved = await save(token, id, 'basic', basic, 1);
    expect([saved.status, saved.body.version, saved.body.description, saved.body.sections.basic]).toEqual([200, 2, LONG, true]);
    const stale = await save(token, id, 'basic', { ...basic, starRating: 5 }, 1); // another tab still on version 1
    expect([stale.status, stale.body.code]).toEqual([412, 'VERSION_CONFLICT']);
    expect((await save(token, id, 'basic', { ...basic, propertyTypeKey: 'castle' }, 2)).body.code).toBe('PROPERTY_TYPE_UNKNOWN');
    expect((await save(token, id, 'nonsense', {}, 2)).status).toBe(400);
  });

  it('all sections done: contacts normalised, times and time zone checked, only property-level amenities', async () => {
    const { token } = await verifiedHotel();
    const { id } = (await createProperty(token)).body;
    let v = 1;
    /** @param {string} s @param {unknown} b */
    const ok = async (s, b) => {
      const r = await save(token, id, s, b, v);
      expect([s, r.status, r.body.errors ?? r.body.code ?? null]).toEqual([s, 200, null]);
      v = r.body.version;
      return r.body;
    };
    await ok('basic', { name: 'Sea View', propertyTypeKey: 'hotel', starRating: 3, description: LONG });
    await ok('location', locationIn(cities.mumbai));
    expect((await ok('contacts', { email: 'Stay@SeaView.in', phone: '98765 43210' })).contacts).toEqual({
      email: 'stay@seaview.in',
      phone: '+919876543210',
      whatsapp: null,
    });
    expect((await save(token, id, 'times', { checkInTime: '25:00', checkOutTime: '11:00', timeZone: 'Asia/Kolkata' }, v)).status).toBe(400);
    expect((await save(token, id, 'times', { checkInTime: '14:00', checkOutTime: '11:00', timeZone: 'Mars/Base' }, v)).status).toBe(400);
    await ok('times', { checkInTime: '14:00', checkOutTime: '11:00', timeZone: 'Asia/Kolkata' });
    await ok('policies', {
      childrenAllowed: true,
      childFreeUntilAge: 5,
      extraBeds: true,
      petsAllowed: false,
      coupleFriendly: true,
      localIdAccepted: true,
      smoking: 'DESIGNATED',
      idProofs: ['AADHAAR', 'PASSPORT'],
    });
    expect((await save(token, id, 'amenities', { amenities: ['wifi', 'tv'] }, v)).body.code).toBe('AMENITY_UNKNOWN'); // TV is a room amenity
    const done = await ok('amenities', { amenities: ['wifi', 'parking', 'wifi'] });
    expect(done.amenities).toEqual(['wifi', 'parking']);
    expect(Object.values(done.sections).every(Boolean)).toBe(true);
  });
});

describe('location and GSTIN', () => {
  it('the pin must be inside the chosen city; the state comes from the city', async () => {
    const { token } = await verifiedHotel();
    const { id } = (await createProperty(token)).body;
    const wrong = await save(token, id, 'location', { ...locationIn(cities.mumbai), lat: cities.delhi.lat, lng: cities.delhi.lng }, 1);
    expect([wrong.status, wrong.body.code, wrong.body.city]).toEqual([422, 'LOCATION_OUTSIDE_CITY', 'Mumbai']);
    expect((await save(token, id, 'location', { ...locationIn(cities.mumbai), areaId: '64b000000000000000000000' }, 1)).body.code).toBe(
      'AREA_UNKNOWN',
    );
    const ok = await save(token, id, 'location', locationIn(cities.mumbai), 1);
    expect(ok.body).toMatchObject({ stateCode: '27', gstin: gstinFor('27'), gstinMissing: false });
  });

  it('a property in a state without a verified GSTIN is told to add one; it is used once verified (D33)', async () => {
    const { token, orgId } = await verifiedHotel();
    const { id } = (await createProperty(token, 'Pink City Palace')).body;
    const jaipur = await save(token, id, 'location', locationIn(cities.jaipur), 1);
    expect(jaipur.body).toMatchObject({ stateCode: '08', gstin: null, gstinMissing: true });
    await ApplicationRecord.updateOne(
      { orgId },
      {
        $push: {
          gstRegistrations: { stateCode: '08', gstin: gstinFor('08'), fileId: 'f', status: 'VERIFIED', addedBy: 'u', addedAt: clock.now() },
        },
      },
    );
    expect((await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body).toMatchObject({
      gstin: gstinFor('08'),
      gstinMissing: false,
    });
  });
});

describe('who sees what', () => {
  it('a Manager limited to one property sees only that one and cannot create; other orgs see nothing', async () => {
    const { token, orgId } = await verifiedHotel();
    const a = (await createProperty(token, 'Property A')).body;
    const b = (await createProperty(token, 'Property B')).body;
    const limited = await users.create({ email: 'manager@seaview.in', name: 'M', password: PASSWORD });
    await orgs.addMember({ orgId, userId: limited.id, roles: ['hotel.manager'], propertyIds: [a.id], addedBy: 's' });
    const desk = await users.create({ email: 'desk@seaview.in', name: 'D', password: PASSWORD });
    await orgs.addMember({ orgId, userId: desk.id, roles: ['hotel.frontDesk'], addedBy: 's' });
    const login = async (/** @type {string} */ email) =>
      (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;
    const m = await login('manager@seaview.in');

    expect((await srv.get('/api/v1/hotel/properties', auth(m))).body.data.map((/** @type {any} */ p) => p.id)).toEqual([a.id]);
    expect((await srv.get(`/api/v1/hotel/properties/${b.id}`, auth(m))).status).toBe(404);
    expect((await save(m, b.id, 'basic', { name: 'Hijack', propertyTypeKey: 'hotel', starRating: 1, description: LONG }, 1)).status).toBe(
      404,
    );
    expect(
      (await save(m, a.id, 'basic', { name: 'Property A', propertyTypeKey: 'hotel', starRating: 3, description: LONG }, 1)).status,
    ).toBe(200);
    expect((await createProperty(m, 'New one')).body.code).toBe('PROPERTY_LIMITED_CANNOT_CREATE');
    expect((await srv.get('/api/v1/hotel/properties', auth(await login('desk@seaview.in')))).status).toBe(403);

    const other = await verifiedHotel('owner@hillview.in');
    expect((await srv.get('/api/v1/hotel/properties', auth(other.token))).body.data).toEqual([]);
    expect((await srv.get(`/api/v1/hotel/properties/${a.id}`, auth(other.token))).status).toBe(404);
  });
});
