// @ts-check
/** Listing workflow, hotel side (S03-T06): the state table, what stops a submit, submit / withdraw / resubmit. */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import {
  LISTING_TRANSITIONS,
  listingTransition,
  PROPERTY_STATUSES,
  PropertyRecord,
  RoomTypeRecord,
  seedMasters,
} from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { completeProperty } from './helpers/hotel-listing.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'listing', 'test', 'secret', 'long-enough-1234'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

describe('state table', () => {
  it('allows exactly the listed moves; everything else is refused', () => {
    for (const status of PROPERTY_STATUSES)
      for (const [action, rule] of Object.entries(LISTING_TRANSITIONS)) {
        const a = /** @type {keyof typeof LISTING_TRANSITIONS} */ (action);
        if (/** @type {readonly string[]} */ (rule.from).includes(status)) expect(listingTransition(status, a)).toBe(rule.to);
        else expect(() => listingTransition(status, a)).toThrow(expect.objectContaining({ code: 'LISTING_TRANSITION_NOT_ALLOWED' }));
      }
    expect(() => listingTransition('ARCHIVED', 'reactivate')).toThrow();
  });
});

describe('submitting', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  let dir = '';
  /** @type {Record<string, any>} */
  let cities = {};
  const users = createUserRepository({ bcryptCost: 4, clock });
  const orgs = createOrganizationsService({ clock });

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    await seedMasters();
    dir = await mkdtemp(path.join(tmpdir(), 'b2b-listing-'));
    const app = express();
    app.use(
      '/api/v1',
      createB2BRouter({
        connect: false,
        logger: createLogger({ write: () => {} }),
        clock,
        env: { B2B_AUTH_SECRET: SECRET, B2B_FILE_DIR: dir },
      }),
    );
    srv = await startServer(app);
    cities = Object.fromEntries((await srv.get('/api/v1/catalog/masters')).body.cities.map((/** @type {any} */ c) => [c.slug, c]));
  });
  afterAll(async () => {
    await srv.close();
    await rm(dir, { recursive: true, force: true });
    await mongo.stop();
  });
  beforeEach(async () => {
    await Promise.all([
      UserRecord.deleteMany({}),
      OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
      MemberRecord.deleteMany({}).setOptions(SYSTEM),
      ApplicationRecord.deleteMany({}).setOptions(SYSTEM),
      PropertyRecord.deleteMany({}).setOptions(SYSTEM),
      RoomTypeRecord.deleteMany({}).setOptions(SYSTEM),
      mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    ]);
  });

  /** @param {string} t */
  const auth = (t) => ({ authorization: `Bearer ${t}` });
  /** @param {'ACTIVE' | 'ONBOARDING'} status */
  async function hotel(status = 'ACTIVE') {
    const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
    const orgId = (await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status, createdBy: 's' }))
      .id;
    const token = (await srv.post('/api/v1/auth/login', { identifier: 'owner@seaview.in', password: PASSWORD }, H)).body.accessToken;
    const property = (await srv.post('/api/v1/hotel/properties', { name: 'Sea View', propertyTypeKey: 'hotel' }, auth(token))).body;
    return { token, orgId, id: property.id };
  }
  /** @param {string} token @param {string} id @param {any} [city] */
  const complete = (token, id, city = cities.mumbai) => completeProperty(srv, auth(token), id, city);
  /** @param {string} token @param {string} id */
  const version = async (token, id) => (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body.version;
  /** @param {string} token @param {string} id @param {'submit' | 'withdraw'} action @param {number | null} v */
  const act = (token, id, action, v) =>
    srv.post(`/api/v1/hotel/properties/${id}/${action}`, {}, { ...auth(token), ...(v === null ? {} : { 'if-match': `"${v}"` }) });

  it('a new draft lists everything still missing at once', async () => {
    const { token, id } = await hotel('ONBOARDING');
    const r = (await srv.get(`/api/v1/hotel/properties/${id}/readiness`, auth(token))).body;
    expect(r.ready).toBe(false);
    expect(r.blockers.map((/** @type {any} */ b) => [b.code, b.detail ?? null])).toEqual([
      ['BUSINESS_NOT_VERIFIED', null],
      ['SECTION_INCOMPLETE', 'basic'],
      ['SECTION_INCOMPLETE', 'location'],
      ['SECTION_INCOMPLETE', 'contacts'],
      ['SECTION_INCOMPLETE', 'times'],
      ['SECTION_INCOMPLETE', 'policies'],
      ['SECTION_INCOMPLETE', 'amenities'],
      ['NO_ROOM_TYPES', null],
      ['NOT_ENOUGH_PHOTOS', 'property:5'],
    ]);
    const refused = await act(token, id, 'submit', await version(token, id));
    expect([refused.status, refused.body.code, refused.body.blockers.length]).toEqual([422, 'PROPERTY_NOT_READY', 9]);
  });

  it('complete → submit (one event, history); no edits while submitted; withdraw; submit again (round 2)', async () => {
    const { token, orgId, id } = await hotel();
    await complete(token, id);
    expect((await srv.get(`/api/v1/hotel/properties/${id}/readiness`, auth(token))).body).toEqual({ ready: true, blockers: [] });
    const v = await version(token, id);
    expect((await act(token, id, 'submit', null)).status).toBe(428);
    expect((await act(token, id, 'submit', v - 1)).status).toBe(412);
    const submitted = await act(token, id, 'submit', v);
    expect(submitted.body).toMatchObject({ status: 'SUBMITTED', round: 1, submittedAt: '2026-11-16T10:00:00.000Z' });
    expect(submitted.body.history.map((/** @type {any} */ h) => h.action)).toEqual(['submit']);
    const events = (await PropertyRecord.findOne({ _id: id, hotelOrgId: orgId }).lean())?.pendingEvents ?? [];
    expect(events.map((e) => [e.type, e.payload.orgId, e.payload.round])).toEqual([['hotel-catalog.property.submitted', orgId, 1]]);

    const edit = await srv.put(
      `/api/v1/hotel/properties/${id}/sections/amenities`,
      { amenities: ['wifi', 'parking'] },
      { ...auth(token), 'if-match': `"${submitted.body.version}"` },
    );
    expect(edit.body.code).toBe('PROPERTY_NOT_EDITABLE');
    expect((await act(token, id, 'submit', submitted.body.version)).body.code).toBe('LISTING_TRANSITION_NOT_ALLOWED');

    const back = await act(token, id, 'withdraw', submitted.body.version);
    expect(back.body.status).toBe('DRAFT');
    const again = await act(token, id, 'submit', back.body.version);
    expect([again.body.status, again.body.round]).toEqual(['SUBMITTED', 2]);
  });

  it('a GST-registered business needs the verified GSTIN for the property state', async () => {
    const { token, orgId, id } = await hotel();
    await ApplicationRecord.create({
      orgId,
      orgType: 'HOTEL',
      createdBy: 'u',
      status: 'APPROVED',
      gstin: '27AAPFU0939F1ZV',
      details: { gstRegistered: true },
    });
    await complete(token, id, cities.jaipur);
    const r = (await srv.get(`/api/v1/hotel/properties/${id}/readiness`, auth(token))).body;
    expect(r.blockers).toEqual([{ code: 'GSTIN_FOR_STATE_MISSING' }]);
  });

  it('room photos are counted per room type', async () => {
    const { token, id } = await hotel();
    await complete(token, id);
    await srv.post(
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
    expect((await srv.get(`/api/v1/hotel/properties/${id}/readiness`, auth(token))).body.blockers).toEqual([
      { code: 'NOT_ENOUGH_ROOM_PHOTOS', detail: 'Suite' },
    ]);
  });
});
