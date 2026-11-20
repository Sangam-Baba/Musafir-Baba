// @ts-check
/** Demo data (owner, 20 Nov 2026): hidden from the website and other clients, visible to the demo client, removed cleanly. */
import { describe, expect, it } from 'vitest';

import { addDays, todayIn } from '../../src/b2b/core/dates.js';
import { addDemoData, DEMO_CLIENT_EMAIL, removeDemoData } from '../../src/b2b/demo/demo-data.js';
import { PropertyRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { ClientCategoryRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { auth, PASSWORD, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-20T06:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    MarginRuleRecord,
    SigningKeyRecord,
    CancellationPolicyRecord,
    RatePlanRecord,
    InventoryDayRecord,
    RateDayRecord,
    ChangeLogRecord,
    ClientCategoryRecord,
  ],
});
const checkIn = addDays(todayIn(clock, 'Asia/Kolkata'), 3);
const stay = { checkIn, checkOut: addDays(checkIn, 2), rooms: [{ adults: 2, childrenAges: [] }] };

describe('demo data', () => {
  it('hidden from the website and other clients; the demo client books from it; removed without touching anything else', async () => {
    await seedPricing(clock);
    const real = await sellableHotel(app, { from: checkIn, to: addDays(checkIn, 5) });
    const r = await addDemoData({ api: app.srv, clock, users: app.users, orgs: app.orgs, password: PASSWORD });
    expect(r.properties).toHaveLength(3);
    await expect(addDemoData({ api: app.srv, clock, users: app.users, orgs: app.orgs, password: PASSWORD })).rejects.toThrow(
      /already there/,
    );
    const demo = /** @type {any} */ (await PropertyRecord.findById(r.properties[0]).setOptions(SYSTEM).lean());
    expect(demo).toMatchObject({
      status: 'LIVE',
      name: expect.stringMatching(/^Demo — /),
      visibility: { website: false, b2b: true, clientCategories: ['DEMO'] },
    });
    // the public website never sees it
    expect((await app.srv.get(`/api/v1/hotels/${demo.publicRef}`)).status).toBe(404);
    expect((await app.srv.post(`/api/v1/hotels/${demo.publicRef}/offers`, stay)).status).toBe(404);
    // a real client (Standard) doesn't either
    const other = await clientOwner(app, 'owner@realtrips.in');
    expect((await app.srv.post(`/api/v1/hotels/${demo.publicRef}/offers`, stay, auth(other.token))).status).toBe(404);
    // the demo client does: rooms and B2B prices
    const token = (await app.srv.post('/api/v1/auth/login', { identifier: DEMO_CLIENT_EMAIL, password: PASSWORD }, { 'x-b2b-auth': '1' }))
      .body.accessToken;
    const offers = await app.srv.post(`/api/v1/hotels/${demo.publicRef}/offers`, stay, auth(token));
    expect(offers.status).toBe(200);
    expect(offers.body.offers.length).toBe(4); // 2 rooms × 2 plans
    // removal: the demo companies and their data only
    expect(await removeDemoData()).toMatchObject({ removed: 2, users: 2 });
    expect(await PropertyRecord.countDocuments({ _id: { $in: r.properties } }).setOptions(SYSTEM)).toBe(0);
    expect(await InventoryDayRecord.countDocuments({ hotelOrgId: r.hotelOrgId }).setOptions(SYSTEM)).toBe(0);
    expect(await OrganizationRecord.countDocuments({ _id: { $in: [r.hotelOrgId, r.clientOrgId] } }).setOptions(SYSTEM)).toBe(0);
    expect((await app.srv.post(`/api/v1/hotels/${real.ref}/offers`, stay)).body.offers.length).toBeGreaterThan(0); // the real hotel is untouched
    expect((await ClientCategoryRecord.findOne({ key: 'DEMO' }).lean())?.active).toBe(false);
    expect(await removeDemoData()).toEqual({ removed: 0 });
  });
});
