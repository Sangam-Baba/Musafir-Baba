// @ts-check
/** Hotel master lists (S03-T02): starter lists (repeat-safe, never overwriting admin changes), public reads, admin changes. */
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { AmenityRecord, CityRecord, seedMasters } from '../../src/b2b/modules/hotel-catalog/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const HOTELS = { 'x-staff': 'h1:hotel-catalog.listing.read,hotel-catalog.listing.review,hotel-catalog.master.manage' };
const SUPPORT = { 'x-staff': 's1:hotel-catalog.listing.read' };

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  const app = express();
  app.use(
    '/api/v1',
    createB2BRouter({
      connect: false,
      logger: createLogger({ write: () => {} }),
      clock,
      env: {},
      authenticate: async (req) => {
        const [staffId, perms] = String(req.get('x-staff') ?? '').split(':');
        return staffId ? { type: 'staff', staffId, permissions: (perms ?? '').split(',') } : null;
      },
    }),
  );
  srv = await startServer(app);
});
afterAll(async () => {
  await srv.close();
  await mongo.stop();
});

describe('starter lists', () => {
  it('are loaded once; later admin changes survive a reload', async () => {
    expect(await seedMasters()).toBe(30 + 29 + 10 + 7 + 4);
    await AmenityRecord.updateOne({ key: 'wifi' }, { $set: { name: 'High-speed Wi-Fi' } });
    await AmenityRecord.updateOne({ key: 'bar' }, { $set: { active: false } });
    expect(await seedMasters()).toBe(0);
    expect((await AmenityRecord.findOne({ key: 'wifi' }).lean())?.name).toBe('High-speed Wi-Fi');
    expect((await AmenityRecord.findOne({ key: 'bar' }).lean())?.active).toBe(false);
  });

  it('anyone can read the active entries (no sign-in needed)', async () => {
    const m = (await srv.get('/api/v1/catalog/masters')).body;
    expect([m.cities.length, m.amenities.length, m.propertyTypes.length, m.bedTypes.length, m.mealPlans.length]).toEqual([
      30, 28, 10, 7, 4,
    ]);
    expect(m.amenities.map((/** @type {any} */ a) => a.key)).not.toContain('bar');
    expect(m.cities[0]).toMatchObject({
      name: 'Delhi',
      slug: 'delhi',
      stateCode: '07',
      lat: 28.6139,
      lng: 77.209,
      radiusKm: 40,
      areas: [],
    });
    expect(m.mealPlans.map((/** @type {any} */ p) => p.code)).toEqual(['EP', 'CP', 'MAP', 'AP']);
    expect(m.amenities.find((/** @type {any} */ a) => a.key === 'wifi')).toEqual({
      id: expect.any(String),
      key: 'wifi',
      name: 'High-speed Wi-Fi',
      order: 0,
      active: true,
      level: 'BOTH',
      group: 'Basics',
      icon: 'wifi',
    });
  });
});

describe('admin changes', () => {
  it('Support sees everything incl. switched-off entries but cannot change anything', async () => {
    const all = (await srv.get('/api/v1/admin/masters', SUPPORT)).body;
    expect(all.amenities.map((/** @type {any} */ a) => a.key)).toContain('bar');
    expect((await srv.post('/api/v1/admin/masters/bed-types', { key: 'futon', name: 'Futon' }, SUPPORT)).status).toBe(403);
    expect((await srv.get('/api/v1/admin/masters')).status).toBe(401);
  });

  it('the Hotels team adds, renames and switches off entries; keys are unique and never change', async () => {
    const made = await srv.post(
      '/api/v1/admin/masters/amenities',
      { key: 'ev-charging', name: 'EV charging', level: 'PROPERTY', group: 'Basics' },
      HOTELS,
    );
    expect([made.status, made.body.key]).toEqual([201, 'ev-charging']);
    expect(
      (await srv.post('/api/v1/admin/masters/amenities', { key: 'ev-charging', name: 'Again', level: 'PROPERTY', group: 'Basics' }, HOTELS))
        .body.code,
    ).toBe('MASTER_KEY_TAKEN');
    expect(
      (await srv.post('/api/v1/admin/masters/amenities', { key: 'x-ray', name: 'X', level: 'ANYWHERE', group: 'Basics' }, HOTELS)).status,
    ).toBe(400);
    expect((await srv.post('/api/v1/admin/masters/cities-typo', { key: 'a1', name: 'A1' }, HOTELS)).status).toBe(400);

    const renamed = await srv.patch(
      `/api/v1/admin/masters/amenities/${made.body.id}`,
      { name: 'EV charging point', active: false },
      HOTELS,
    );
    expect(renamed.body).toMatchObject({ key: 'ev-charging', name: 'EV charging point', active: false });
    expect((await srv.patch(`/api/v1/admin/masters/amenities/${made.body.id}`, { key: 'other' }, HOTELS)).status).toBe(400);
    expect((await srv.patch('/api/v1/admin/masters/amenities/64b000000000000000000000', { name: 'Ghost' }, HOTELS)).status).toBe(404);
    const plan = await srv.post('/api/v1/admin/masters/meal-plans', { key: 'all-inclusive', code: 'AI', name: 'All inclusive' }, HOTELS);
    expect(plan.body).toMatchObject({ code: 'AI', description: null });
  });

  it('cities: centre must be in India, unique name, areas added and switched off', async () => {
    const swapped = await srv.post(
      '/api/v1/admin/masters/cities',
      { name: 'Ooty', stateCode: '33', lat: 76.695, lng: 11.4102, radiusKm: 20 },
      HOTELS,
    );
    expect([swapped.status, swapped.body.code]).toEqual([422, 'LOCATION_OUTSIDE_INDIA']);
    expect(
      (await srv.post('/api/v1/admin/masters/cities', { name: 'Ooty', stateCode: '99', lat: 11.4102, lng: 76.695, radiusKm: 20 }, HOTELS))
        .status,
    ).toBe(400);
    const ooty = await srv.post(
      '/api/v1/admin/masters/cities',
      { name: 'Ooty', stateCode: '33', lat: 11.4102, lng: 76.695, radiusKm: 20 },
      HOTELS,
    );
    expect([ooty.status, ooty.body.slug]).toEqual([201, 'ooty']);
    expect(
      (await srv.post('/api/v1/admin/masters/cities', { name: 'OOTY', stateCode: '33', lat: 11.4, lng: 76.7, radiusKm: 20 }, HOTELS)).body
        .code,
    ).toBe('CITY_EXISTS');

    const withArea = await srv.post(`/api/v1/admin/masters/cities/${ooty.body.id}/areas`, { name: 'Charing Cross' }, HOTELS);
    expect(withArea.body.areas).toMatchObject([{ name: 'Charing Cross', slug: 'charing-cross', active: true }]);
    expect((await srv.post(`/api/v1/admin/masters/cities/${ooty.body.id}/areas`, { name: 'Charing  Cross' }, HOTELS)).body.code).toBe(
      'AREA_EXISTS',
    );
    const areaId = withArea.body.areas[0].id;
    await srv.patch(`/api/v1/admin/masters/cities/${ooty.body.id}/areas/${areaId}`, { active: false }, HOTELS);
    const pub = (await srv.get('/api/v1/catalog/masters')).body.cities.find((/** @type {any} */ c) => c.slug === 'ooty');
    expect(pub.areas).toEqual([]);

    const moved = await srv.patch(`/api/v1/admin/masters/cities/${ooty.body.id}`, { lat: 11.41, radiusKm: 25 }, HOTELS);
    expect(moved.body).toMatchObject({ lat: 11.41, lng: 76.695, radiusKm: 25 });
    expect((await CityRecord.findOne({ slug: 'ooty' }).lean())?.updatedBy).toBe('staff:h1');
  });
});
