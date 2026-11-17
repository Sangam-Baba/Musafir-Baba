// @ts-check
/** Room types (S03-T04): occupancy rules, master lists, unique names per property, version check, property limits. */
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { PropertyRecord, RoomTypeRecord, seedMasters } from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'room', 'types', 'test', 'secret', 'long-enough-1'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

const deluxe = {
  name: 'Deluxe Sea View',
  description: 'Corner room with a balcony over the bay.',
  sizeSqm: 32,
  beds: [{ bedTypeKey: 'king', count: 1 }],
  maxAdults: 2,
  maxChildren: 1,
  maxOccupancy: 3,
  extraBeds: { allowed: true, max: 1 },
  amenities: ['air-conditioning', 'tv', 'wifi', 'hot-water'],
};

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
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
    PropertyRecord.deleteMany({}).setOptions(SYSTEM),
    RoomTypeRecord.deleteMany({}).setOptions(SYSTEM),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });
/** @param {string} email */
const login = async (email) => (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;

/** A hotel org with its Owner signed in and one property. @param {string} [email] */
async function hotelWithProperty(email = 'owner@seaview.in') {
  const owner = await users.create({ email, name: 'Owner', password: PASSWORD });
  const orgId = (
    await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
  ).id;
  const token = await login(email);
  const property = (await srv.post('/api/v1/hotel/properties', { name: 'Sea View Marine Drive', propertyTypeKey: 'hotel' }, auth(token)))
    .body;
  return { token, orgId, propertyId: property.id };
}
/** @param {string} token @param {string} propertyId @param {Record<string, unknown>} [change] */
const createRoom = (token, propertyId, change = {}) =>
  srv.post(`/api/v1/hotel/properties/${propertyId}/room-types`, { ...deluxe, ...change }, auth(token));

describe('room types', () => {
  it('created with beds, occupancy and room amenities; listed in order', async () => {
    const { token, propertyId } = await hotelWithProperty();
    const made = await createRoom(token, propertyId);
    expect([made.status, made.headers.get('etag')]).toEqual([201, '"1"']);
    expect(made.body).toMatchObject({
      propertyId,
      name: 'Deluxe Sea View',
      maxOccupancy: 3,
      extraBeds: { allowed: true, max: 1 },
      status: 'ACTIVE',
    });
    await createRoom(token, propertyId, { name: 'Standard', order: 1 });
    const list = (await srv.get(`/api/v1/hotel/properties/${propertyId}/room-types`, auth(token))).body.data;
    expect(list.map((/** @type {any} */ r) => r.name)).toEqual(['Standard', 'Deluxe Sea View']);
  });

  it('refuses: occupancy that does not add up (all problems at once), unknown beds, hotel-level amenities, a name used twice', async () => {
    const { token, propertyId } = await hotelWithProperty();
    const bad = await createRoom(token, propertyId, {
      maxAdults: 2,
      maxChildren: 0,
      maxOccupancy: 4,
      extraBeds: { allowed: true, max: 0 },
    });
    expect([bad.status, bad.body.code]).toEqual([422, 'ROOM_TYPE_INVALID']);
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code)).toEqual([
      'OCCUPANCY_ABOVE_ADULTS_AND_CHILDREN',
      'EXTRA_BEDS_NUMBER_REQUIRED',
    ]);
    expect((await createRoom(token, propertyId, { beds: [{ bedTypeKey: 'hammock', count: 1 }] })).body.code).toBe('BED_TYPE_UNKNOWN');
    expect((await createRoom(token, propertyId, { amenities: ['parking'] })).body.code).toBe('AMENITY_UNKNOWN');
    expect((await createRoom(token, propertyId, { beds: [] })).status).toBe(400);
    expect((await createRoom(token, propertyId)).status).toBe(201);
    expect((await createRoom(token, propertyId, { name: '  deluxe   SEA view ' })).body.code).toBe('ROOM_TYPE_NAME_TAKEN');
  });

  it('changes need the loaded version; deleting frees the name; nothing changes once the property is not editable', async () => {
    const { token, orgId, propertyId } = await hotelWithProperty();
    const r = (await createRoom(token, propertyId)).body;
    const url = `/api/v1/hotel/properties/${propertyId}/room-types/${r.id}`;
    expect((await srv.put(url, { ...deluxe, sizeSqm: 35 }, auth(token))).status).toBe(428);
    const changed = await srv.put(url, { ...deluxe, sizeSqm: 35 }, { ...auth(token), 'if-match': '"1"' });
    expect([changed.status, changed.body.sizeSqm, changed.body.version]).toEqual([200, 35, 2]);
    expect((await srv.put(url, { ...deluxe, sizeSqm: 40 }, { ...auth(token), 'if-match': '"1"' })).body.code).toBe('VERSION_CONFLICT');
    expect((await srv.del(url, auth(token))).status).toBe(204);
    expect((await createRoom(token, propertyId)).status).toBe(201);

    await PropertyRecord.updateOne({ _id: propertyId, hotelOrgId: orgId }, { $set: { status: 'SUBMITTED' } });
    expect((await createRoom(token, propertyId, { name: 'Suite' })).body.code).toBe('PROPERTY_NOT_EDITABLE');
  });

  it("follows the property's limits: unassigned property → 404, Front Desk 403, other org 404", async () => {
    const { token, orgId, propertyId } = await hotelWithProperty();
    const other = (await srv.post('/api/v1/hotel/properties', { name: 'Hill View Manali', propertyTypeKey: 'resort' }, auth(token))).body;
    const manager = await users.create({ email: 'manager@seaview.in', name: 'M', password: PASSWORD });
    await orgs.addMember({ orgId, userId: manager.id, roles: ['hotel.manager'], propertyIds: [propertyId], addedBy: 's' });
    const desk = await users.create({ email: 'desk@seaview.in', name: 'D', password: PASSWORD });
    await orgs.addMember({ orgId, userId: desk.id, roles: ['hotel.frontDesk'], addedBy: 's' });
    const m = await login('manager@seaview.in');
    expect((await createRoom(m, propertyId)).status).toBe(201);
    expect((await createRoom(m, other.id)).status).toBe(404);
    expect((await srv.get(`/api/v1/hotel/properties/${other.id}/room-types`, auth(m))).status).toBe(404);
    expect((await srv.get(`/api/v1/hotel/properties/${propertyId}/room-types`, auth(await login('desk@seaview.in')))).status).toBe(403);
    const stranger = await hotelWithProperty('owner@hill.in');
    expect((await srv.get(`/api/v1/hotel/properties/${propertyId}/room-types`, auth(stranger.token))).status).toBe(404);
  });
});
