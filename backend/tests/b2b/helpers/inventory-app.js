// @ts-check
/**
 * Shared setup for the Stage 04 (rooms, prices, rules) integration tests: an in-memory standalone MongoDB, the
 * B2B router, and helpers to make a hotel with its Owner signed in, a property, staff with limits. A second server
 * (`admin`) takes stand-in MusafirBaba staff from the `x-staff: <id>:<perm>,<perm>` header (`asStaff`).
 * Call `useInventoryApp(...)` once at the top of a test file; it registers beforeAll / afterAll / beforeEach.
 */
import express from 'express';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { runMigrations } from '../../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../../src/b2b/core/rate-limit.js';
import { PropertyRecord, RoomTypeRecord, seedMasters } from '../../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../../src/b2b/routes/v1.js';
import { startServer } from './http.js';
import { startMongo } from './mongo.js';

export const PASSWORD = 'correct-horse-battery';
export const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

export const DELUXE = {
  name: 'Deluxe',
  description: '',
  sizeSqm: 30,
  beds: [{ bedTypeKey: 'king', count: 1 }],
  maxAdults: 2,
  maxChildren: 1,
  maxOccupancy: 3,
  extraBeds: { allowed: false, max: 0 },
  amenities: [],
};

/** @param {string} t */
export const auth = (t) => ({ authorization: `Bearer ${t}` });

/** A stand-in MusafirBaba staff member on the `admin` server. @param {string} who e.g. 'a1:hotel-inventory.admin.read' */
export const asStaff = (who) => ({ 'x-staff': who });

/**
 * @param {{ clock: import('../../../src/b2b/core/clock.js').Clock, models?: import('mongoose').Model<any>[] }} options
 *   `models`: the test's own collections, emptied before each test (with the ones every test needs)
 */
export function useInventoryApp(options) {
  /** @type {{ mongo: Awaited<ReturnType<typeof startMongo>>, srv: Awaited<ReturnType<typeof startServer>>, admin: Awaited<ReturnType<typeof startServer>> }} */
  const env = /** @type {any} */ ({});
  const users = createUserRepository({ bcryptCost: 4, clock: options.clock });
  const orgs = createOrganizationsService({ clock: options.clock });
  const secret = ['b2b', 'inventory', 'test', 'secret', 'long-enough-1'].join('-');

  beforeAll(async () => {
    env.mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock: options.clock, owner: 'test' });
    await seedMasters();
    const app = express();
    app.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger: createLogger({ write: () => {} }),
        clock: options.clock,
        env: { B2B_AUTH_SECRET: secret, B2B_ORDERS_ENABLED: 'true' },
      }),
    );
    env.srv = await startServer(app);
    const staffApp = express();
    staffApp.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger: createLogger({ write: () => {} }),
        clock: options.clock,
        env: { B2B_AUTH_SECRET: secret, B2B_ORDERS_ENABLED: 'true' },
        authenticate: async (req) => {
          const [staffId, perms] = String(req.get('x-staff') ?? '').split(':');
          return staffId ? { type: 'staff', staffId, permissions: (perms ?? '').split(',') } : null;
        },
      }),
    );
    env.admin = await startServer(staffApp);
  });
  afterAll(async () => {
    await env.srv.close();
    await env.admin.close();
    await env.mongo.stop();
  });
  beforeEach(async () => {
    await Promise.all([
      UserRecord.deleteMany({}),
      OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
      MemberRecord.deleteMany({}).setOptions(SYSTEM),
      PropertyRecord.deleteMany({}).setOptions(SYSTEM),
      RoomTypeRecord.deleteMany({}).setOptions(SYSTEM),
      ...(options.models ?? []).map((m) => m.deleteMany({}).setOptions(SYSTEM)),
      env.mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    ]);
  });

  /** @param {string} email */
  const login = async (email) => (await env.srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;

  /** A hotel org with its Owner signed in and one property. @param {string} [email] */
  async function hotelWithProperty(email = 'owner@seaview.in') {
    const owner = await users.create({ email, name: 'Owner', password: PASSWORD });
    const orgId = (
      await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    const token = await login(email);
    const property = (
      await env.srv.post('/api/v1/hotel/properties', { name: 'Sea View Marine Drive', propertyTypeKey: 'hotel' }, auth(token))
    ).body;
    return { token, orgId, propertyId: /** @type {string} */ (property.id) };
  }

  /** A second property of the same hotel. @param {string} token */
  const anotherProperty = async (token) =>
    /** @type {string} */ (
      (await env.srv.post('/api/v1/hotel/properties', { name: 'Hill View Manali', propertyTypeKey: 'resort' }, auth(token))).body.id
    );

  /** A staff member signed in. @param {string} orgId @param {string} email @param {string} role @param {string[]} [propertyIds] */
  async function staff(orgId, email, role, propertyIds = []) {
    const u = await users.create({ email, name: 'Staff', password: PASSWORD });
    await orgs.addMember({ orgId, userId: u.id, roles: [role], propertyIds, addedBy: 's' });
    return login(email);
  }

  /** A room type on the property. @param {string} token @param {string} propertyId @param {Record<string, unknown>} [change] */
  const roomType = async (token, propertyId, change = {}) =>
    /** @type {string} */ (
      (await env.srv.post(`/api/v1/hotel/properties/${propertyId}/room-types`, { ...DELUXE, ...change }, auth(token))).body.id
    );

  return {
    get srv() {
      return env.srv;
    },
    get mongo() {
      return env.mongo;
    },
    get admin() {
      return env.admin;
    },
    users,
    orgs,
    login,
    hotelWithProperty,
    anotherProperty,
    staff,
    roomType,
  };
}
