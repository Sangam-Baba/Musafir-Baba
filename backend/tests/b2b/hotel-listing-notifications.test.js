// @ts-check
/** Listing notifications (S03-T10): approved / changes requested / suspended / revision reviewed → bell + email; admin queue pushes. */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { eventBus } from '../../src/b2b/background.js';
import { newEvent } from '../../src/b2b/core/db/events.js';
import { consumerJobHandlers, relayOnce } from '../../src/b2b/core/db/events-relay.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createJobRunner } from '../../src/b2b/core/jobs/runner.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { PropertyRecord, RoomTypeRecord, seedMasters } from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createDelivery, InboxRecord, visibleOrgCategories } from '../../src/b2b/modules/notifications/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { completeProperty } from './helpers/hotel-listing.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'listing', 'notifications', 'secret', 'long-1'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const HOTELS = { 'x-staff': 'h1:hotel-catalog.listing.read,hotel-catalog.listing.review' };

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
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-listing-ntf-'));
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
    InboxRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });

describe('delivery of listing events', () => {
  /** @type {{ to: string, subject: string, text: string }[]} */
  let emails = [];
  /** @type {{ room: string, event: string, data: Record<string, unknown> }[]} */
  let pushes = [];
  const delivery = () =>
    createDelivery({
      clock,
      publicUrl: 'https://musafirbaba.com',
      orgName: async () => 'Sea View Hotels',
      ownerContacts: async () => [{ userId: 'u1', email: 'owner@seaview.in' }],
      userContact: async () => null,
      queueEmail: async (m) => void emails.push(m),
      publish: async (room, event, data) => void pushes.push({ room, event, data }),
    });
  const base = { orgId: 'org-1', propertyId: 'prop-1', publicRef: 'MBHT-ABC123', name: 'Sea View Marine Drive' };

  it('each decision becomes a bell entry (with the listing link) and an email to the Owners', async () => {
    emails = [];
    pushes = [];
    await delivery()(newEvent('hotel-catalog.property.published', base, { clock }));
    await delivery()(newEvent('hotel-catalog.property.changes-requested', { ...base, reason: null }, { clock }));
    await delivery()(newEvent('hotel-catalog.property.suspended', { ...base, reason: 'Guest complaints under review' }, { clock }));
    await delivery()(newEvent('hotel-catalog.revision.decided', { ...base, decision: 'REJECTED', fields: ['name'] }, { clock }));
    const rows = await InboxRecord.find({ recipientId: 'org-1' }).sort({ _id: 1 }).lean();
    expect(rows.map((r) => [r.category, r.critical, r.link, r.body])).toEqual([
      ['listing.published', false, '/business/properties/prop-1', 'Sea View Marine Drive is now live on MusafirBaba.'],
      [
        'listing.changes-requested',
        true,
        '/business/properties/prop-1',
        'Some parts of Sea View Marine Drive need changes. Open the listing to see the comments.',
      ],
      ['listing.suspended', true, '/business/properties/prop-1', 'Sea View Marine Drive was taken off sale: Guest complaints under review'],
      ['listing.revision-decided', false, '/business/properties/prop-1', 'Your changes to Sea View Marine Drive were not approved.'],
    ]);
    expect(emails.map((e) => e.subject)).toEqual([
      'Your listing is live — MusafirBaba Business',
      'Your listing needs changes — MusafirBaba Business',
      'Your listing was suspended — MusafirBaba Business',
      'Your listing changes were reviewed — MusafirBaba Business',
    ]);
    expect(emails[0]?.text).toContain('https://musafirbaba.com/business/properties/prop-1');
    expect(pushes.filter((p) => p.event === 'queue:changed').map((p) => p.data.queue)).toEqual(['listings', 'listings', 'listings']);
  });

  it('a submission refreshes the MusafirBaba listings queue (no hotel notification)', async () => {
    pushes = [];
    await delivery()(newEvent('hotel-catalog.property.submitted', { ...base, round: 1 }, { clock }));
    expect(pushes).toEqual([{ room: 'b2b:admin:general', event: 'queue:changed', data: { queue: 'listings' } }]);
  });

  it('listing notifications reach members who can see listings (Owner, Manager), not KYC-only views', () => {
    expect(visibleOrgCategories(['hotel-catalog.property.read'])).toEqual([
      'listing.published',
      'listing.changes-requested',
      'listing.suspended',
      'listing.revision-decided',
    ]);
  });
});

describe('end to end', () => {
  it('MusafirBaba approves → after the background step the hotel’s bell says the listing is live', async () => {
    const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
    const orgId = (
      await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    const manager = await users.create({ email: 'manager@seaview.in', name: 'M', password: PASSWORD });
    await orgs.addMember({ orgId, userId: manager.id, roles: ['hotel.manager'], addedBy: 's' });
    const login = async (/** @type {string} */ email) =>
      (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, { 'x-b2b-auth': '1' })).body.accessToken;
    const token = await login('owner@seaview.in');
    const id = (await srv.post('/api/v1/hotel/properties', { name: 'Sea View', propertyTypeKey: 'hotel' }, auth(token))).body.id;
    await completeProperty(srv, auth(token), id, cities.mumbai);
    const v = (await srv.get(`/api/v1/hotel/properties/${id}`, auth(token))).body.version;
    await srv.post(`/api/v1/hotel/properties/${id}/submit`, {}, { ...auth(token), 'if-match': `"${v}"` });
    await admin.post(`/api/v1/admin/properties/${id}/approve`, {}, HOTELS);

    await relayOnce(PropertyRecord, eventBus, clock);
    const runner = createJobRunner({
      handlers: consumerJobHandlers(eventBus, clock),
      workerId: 'test',
      clock,
      logger: createLogger({ write: () => {} }),
    });
    while (await runner.processOne()) {
      /* drain */
    }
    for (const who of [token, await login('manager@seaview.in')]) {
      const bell = (await srv.get('/api/v1/notifications', auth(who))).body.data;
      expect(bell.map((/** @type {any} */ n) => [n.category, n.link])).toEqual([['listing.published', `/business/properties/${id}`]]);
    }

    // a Manager limited to another property doesn't see notifications about this one
    const other = (await srv.post('/api/v1/hotel/properties', { name: 'Hill View', propertyTypeKey: 'resort' }, auth(token))).body.id;
    const limited = await users.create({ email: 'limited@seaview.in', name: 'L', password: PASSWORD });
    await orgs.addMember({ orgId, userId: limited.id, roles: ['hotel.manager'], propertyIds: [other], addedBy: 's' });
    expect((await srv.get('/api/v1/notifications', auth(await login('limited@seaview.in')))).body.data).toEqual([]);
  });
});
