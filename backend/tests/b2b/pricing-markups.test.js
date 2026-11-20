// @ts-check
/** A B2B client's own display markup (S05-T08): rules, "my selling price", API, permissions, isolation. */
import { describe, expect, it } from 'vitest';

import { ClientMarkupRecord, markupFor, markupProblems, sellingPrice } from '../../src/b2b/modules/pricing/index.js';
import { auth, PASSWORD, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({ clock, models: [ClientMarkupRecord] });

/** @typedef {import('../../src/b2b/modules/pricing/domain/markup.js').Markup} Markup */
/** @type {Markup} */
const markup = {
  enabled: true,
  adjustment: { type: 'PERCENT', value: 1000 },
  overrides: [
    { match: { cityId: 'goa' }, adjustment: { type: 'FIXED_PER_NIGHT', value: 50000 } },
    { match: { cityId: 'goa', propertyId: 'p9' }, adjustment: { type: 'FIXED_PER_BOOKING', value: 20000 } },
    { match: { starRating: 5 }, adjustment: { type: 'PERCENT', value: 2000, minPaise: 100000 } },
  ],
};
const price = { totalPaise: 189000, nightly: [{ sellPaise: 90000 }, { sellPaise: 90000 }] };

describe('rules', () => {
  it('default 10 % of the client price per room-night', () => {
    expect(sellingPrice(markup, { propertyId: 'p1', cityId: 'jaipur' }, price)).toEqual({ markupPaise: 18000, sellingPricePaise: 207000 });
  });

  it('the most specific override wins: property > city > stars', () => {
    expect(markupFor(markup, { propertyId: 'p1', cityId: 'goa', starRating: 5 })).toMatchObject({ type: 'FIXED_PER_NIGHT', value: 50000 });
    expect(sellingPrice(markup, { propertyId: 'p9', cityId: 'goa', starRating: 5 }, price).markupPaise).toBe(20000);
    expect(sellingPrice(markup, { propertyId: 'p2', cityId: 'delhi', starRating: 5 }, price).markupPaise).toBe(200000); // min ₹1,000 per night
  });

  it('switched off or never set → selling price = what the client pays', () => {
    expect(sellingPrice({ ...markup, enabled: false }, { propertyId: 'p1' }, price)).toEqual({ markupPaise: 0, sellingPricePaise: 189000 });
    expect(sellingPrice(null, { propertyId: 'p1' }, price).sellingPricePaise).toBe(189000);
  });

  it('never negative; every problem listed', () => {
    const bad = {
      enabled: true,
      adjustment: { type: /** @type {const} */ ('FIXED_PER_NIGHT'), value: -5, minPaise: 1 },
      overrides: [{ match: {}, adjustment: { type: /** @type {const} */ ('PERCENT'), value: 999999 } }],
    };
    expect(markupProblems(bad).map((p) => p.code)).toEqual(['VALUE_INVALID', 'BOUNDS_ONLY_FOR_PERCENT', 'MATCH_EMPTY', 'VALUE_INVALID']);
  });
});

describe('API', () => {
  /** A client company with its Owner signed in. @param {string} email */
  async function client(email) {
    const owner = await app.users.create({ email, name: 'Owner', password: PASSWORD });
    const orgId = (
      await app.orgs.createOrganization({ type: 'CLIENT', legalName: 'Trips Co', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    return { orgId, token: await app.login(email) };
  }
  const body = { enabled: true, adjustment: { type: 'PERCENT', value: 1500 }, overrides: [] };

  it('first save on version 0, later saves on the loaded version (412 when stale)', async () => {
    const c = await client('owner@trips.in');
    const empty = await app.srv.get('/api/v1/markups', auth(c.token));
    expect(empty.body).toMatchObject({ enabled: false, version: 0 });
    expect(empty.headers.get('etag')).toBe('"0"');
    const saved = await app.srv.put('/api/v1/markups', body, { ...auth(c.token), 'if-match': '"0"' });
    expect(saved.body).toMatchObject({ enabled: true, adjustment: { type: 'PERCENT', value: 1500 }, version: 1 });
    expect((await app.srv.put('/api/v1/markups', body, { ...auth(c.token), 'if-match': '"0"' })).status).toBe(412);
    expect((await app.srv.put('/api/v1/markups', { ...body, enabled: false }, { ...auth(c.token), 'if-match': '"1"' })).body.version).toBe(
      2,
    );
  });

  it("booking agents see it, can't change it; hotels have no markup", async () => {
    const c = await client('owner@trips.in');
    const agent = await app.staff(c.orgId, 'agent@trips.in', 'client.bookingAgent');
    expect((await app.srv.get('/api/v1/markups', auth(agent))).status).toBe(200);
    expect((await app.srv.put('/api/v1/markups', body, { ...auth(agent), 'if-match': '"0"' })).status).toBe(403);
    const hotel = await app.hotelWithProperty('owner@seaview.in');
    expect((await app.srv.get('/api/v1/markups', auth(hotel.token))).status).toBe(403);
  });

  it('each client only ever sees and changes its own markup', async () => {
    const a = await client('owner@a.in');
    const b = await client('owner@b.in');
    await app.srv.put('/api/v1/markups', body, { ...auth(a.token), 'if-match': '"0"' });
    expect((await app.srv.get('/api/v1/markups', auth(b.token))).body).toMatchObject({ enabled: false, version: 0 });
    await expect(ClientMarkupRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
    expect(await ClientMarkupRecord.countDocuments({ clientOrgId: a.orgId })).toBe(1);
  });

  it('wrong markups are refused with every problem; extra fields are refused', async () => {
    const c = await client('owner@trips.in');
    const bad = await app.srv.put(
      '/api/v1/markups',
      { ...body, adjustment: { type: 'PERCENT', value: -1 } },
      { ...auth(c.token), 'if-match': '"0"' },
    );
    expect(bad.status).toBe(422);
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code)).toEqual(['VALUE_INVALID']);
    expect((await app.srv.put('/api/v1/markups', { ...body, clientOrgId: 'x' }, { ...auth(c.token), 'if-match': '"0"' })).status).toBe(400);
  });
});
