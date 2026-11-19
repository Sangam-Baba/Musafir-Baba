// @ts-check
/** Client categories (S10-T04): admin list, a client's category, and search using it (B2B prices, B2B visibility). */
import { beforeEach, describe, expect, it } from 'vitest';

import { evictCachedPrefix } from '../../src/b2b/core/cache.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { ClientCategoryRecord, OrganizationRecord, seedClientCategories } from '../../src/b2b/modules/organizations/index.js';
import { MarginRuleRecord } from '../../src/b2b/modules/pricing/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    ClientCategoryRecord,
    MarginRuleRecord,
    CancellationPolicyRecord,
    RatePlanRecord,
    InventoryDayRecord,
    RateDayRecord,
    ChangeLogRecord,
  ],
});
const OPS = asStaff('o1:platform.org.read,platform.org.manage');
const READER = asStaff('r1:platform.org.read');
const stay = { checkIn: '2026-12-01', checkOut: '2026-12-02', rooms: [{ adults: 2, childrenAges: [] }] };

beforeEach(async () => {
  await seedClientCategories();
});

describe('the list', () => {
  it('seeded Standard / Silver / Gold, once; add, rename, switch off (never deleted)', async () => {
    expect(await seedClientCategories()).toBe(0);
    const list = await app.admin.get('/api/v1/admin/client-categories', READER);
    expect(list.body.data.map((/** @type {any} */ c) => c.key)).toEqual(['STANDARD', 'SILVER', 'GOLD']);
    const added = await app.admin.post('/api/v1/admin/client-categories', { key: 'platinum', name: 'Platinum', order: 40 }, OPS);
    expect(added.body).toMatchObject({ key: 'PLATINUM', name: 'Platinum', active: true });
    expect((await app.admin.post('/api/v1/admin/client-categories', { key: 'GOLD', name: 'Again' }, OPS)).body.code).toBe(
      'CATEGORY_EXISTS',
    );
    await app.admin.patch('/api/v1/admin/client-categories/SILVER', { name: 'Silver partners', active: false }, OPS);
    expect((await app.admin.get('/api/v1/admin/client-categories', READER)).body.data.map((/** @type {any} */ c) => c.key)).toEqual([
      'STANDARD',
      'GOLD',
      'PLATINUM',
    ]);
    expect((await app.admin.get('/api/v1/admin/client-categories?includeInactive=true', READER)).body.data).toHaveLength(4);
  });

  it('only organisation managers change it', async () => {
    expect((await app.admin.post('/api/v1/admin/client-categories', { key: 'X1', name: 'X one' }, READER)).status).toBe(403);
    expect((await app.admin.get('/api/v1/admin/client-categories', asStaff('h1:hotel-catalog.listing.read'))).status).toBe(403);
  });
});

describe("a client's category", () => {
  it('set by an admin (active categories, clients only), stored with an event; same again changes nothing', async () => {
    const c = await clientOwner(app, 'owner@trips.in');
    const r = await app.admin.put(`/api/v1/admin/orgs/${c.orgId}/client-category`, { key: 'GOLD' }, OPS);
    expect(r.body).toEqual({ orgId: c.orgId, clientCategory: 'GOLD', changed: true });
    const org = /** @type {any} */ (await OrganizationRecord.findById(c.orgId).setOptions(SYSTEM).lean());
    expect(org.clientCategory).toBe('GOLD');
    expect(org.pendingEvents.map((/** @type {any} */ e) => [e.type, e.payload.clientCategory])).toContainEqual([
      'organizations.org.category-changed',
      'GOLD',
    ]);
    expect((await app.admin.put(`/api/v1/admin/orgs/${c.orgId}/client-category`, { key: 'GOLD' }, OPS)).body.changed).toBe(false);
    expect((await app.admin.get(`/api/v1/admin/orgs/${c.orgId}`, READER)).body.clientCategory).toBe('GOLD'); // admin client page
    await app.admin.patch('/api/v1/admin/client-categories/SILVER', { active: false }, OPS);
    expect((await app.admin.put(`/api/v1/admin/orgs/${c.orgId}/client-category`, { key: 'SILVER' }, OPS)).body.code).toBe(
      'CATEGORY_NOT_ACTIVE',
    );
    const hotel = await app.hotelWithProperty('owner@seaview.in');
    expect((await app.admin.put(`/api/v1/admin/orgs/${hotel.orgId}/client-category`, { key: 'GOLD' }, OPS)).status).toBe(404);
    expect((await app.admin.put(`/api/v1/admin/orgs/${c.orgId}/client-category`, { key: 'GOLD' }, READER)).status).toBe(403);
  });

  it('search uses it: a Gold rule gives Gold prices, Gold-only hotels appear only to Gold clients', async () => {
    await seedPricing(clock);
    const h = await sellableHotel(app, { name: 'Open to all' });
    await sellableHotel(app, { name: 'Gold only', visibility: { website: false, b2b: true, clientCategories: ['GOLD'], sellFrom: null } });
    await MarginRuleRecord.create({
      name: 'Gold clients',
      priority: 5,
      match: { channels: ['B2B_PORTAL'], clientCategory: 'GOLD' },
      adjustment: { type: 'FIXED_PER_NIGHT', value: 5000 },
      status: 'ACTIVE',
      createdBy: 't',
    });
    evictCachedPrefix('pricing:');
    const gold = await clientOwner(app, 'owner@gold.in');
    const plain = await clientOwner(app, 'owner@plain.in');
    await app.admin.put(`/api/v1/admin/orgs/${gold.orgId}/client-category`, { key: 'GOLD' }, OPS);
    const search = async (/** @type {string} */ token) =>
      (await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay, sort: 'price' }, auth(token)))
        .body.items;
    const goldItems = await search(gold.token);
    expect(goldItems.map((/** @type {any} */ i) => i.name).sort()).toEqual(['Gold only', 'Open to all']);
    expect(goldItems.find((/** @type {any} */ i) => i.name === 'Open to all').from.totalPaise).toBe(78750); // (₹700 + ₹50) × 1.05
    const plainItems = await search(plain.token);
    expect(plainItems.map((/** @type {any} */ i) => i.name)).toEqual(['Open to all']);
    expect(plainItems[0].from.totalPaise).toBe(89250); // B2B default (₹700 + ₹150) × 1.05
  });
});
