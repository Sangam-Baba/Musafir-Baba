// @ts-check
/** Destination autocomplete (S06-T03) and the search gateway: matching, ranking, channels, permissions, IP limits. */
import { beforeEach, describe, expect, it } from 'vitest';

import { evictCachedPrefix } from '../../src/b2b/core/cache.js';
import { newReference } from '../../src/b2b/core/ids.js';
import { CityRecord, PropertyRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import { buildIndex, normalise, suggest } from '../../src/b2b/modules/hotel-search/index.js';
import { auth, PASSWORD, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({ clock });

describe('matching (pure)', () => {
  const index = buildIndex([
    { type: 'CITY', id: 'goa', name: 'Goa', cityId: 'goa', cityName: 'Goa', popularity: 30 },
    { type: 'CITY', id: 'gangtok', name: 'Gangtok', cityId: 'gangtok', cityName: 'Gangtok', popularity: 5 },
    { type: 'AREA', id: 'baga', name: 'Baga Beach', cityId: 'goa', cityName: 'Goa', popularity: 12 },
    { type: 'PROPERTY', id: 'MBHT-1', name: 'Goa Marriott Resort', cityId: 'goa', cityName: 'Goa', popularity: 0 },
    { type: 'PROPERTY', id: 'MBHT-2', name: 'Sea View Marine Drive', cityId: 'mumbai', cityName: 'Mumbai', popularity: 0 },
    { type: 'PROPERTY', id: 'MBHT-3', name: 'Café Côte', cityId: 'goa', cityName: 'Goa', popularity: 0 },
  ]);
  it('exact name first, then prefix; cities before areas before hotels', () => {
    expect(suggest(index, 'goa').map((d) => d.id)).toEqual(['goa', 'MBHT-1']);
    expect(suggest(index, 'g').length).toBe(0); // at least 2 letters
    expect(suggest(index, 'ga').map((d) => d.id)).toEqual(['gangtok']);
  });
  it('any word of a name, accents and punctuation ignored', () => {
    expect(suggest(index, 'marine').map((d) => d.id)).toEqual(['MBHT-2']);
    expect(suggest(index, 'beach').map((d) => d.id)).toEqual(['baga']);
    expect(suggest(index, 'cote').map((d) => d.id)).toEqual(['MBHT-3']);
    expect(suggest(index, 'marine dr').map((d) => d.id)).toEqual(['MBHT-2']);
    expect(normalise("  St. Mary's  Café ")).toBe('st mary s cafe');
  });
});

describe('GET /hotels/destinations', () => {
  beforeEach(async () => {
    evictCachedPrefix('search:');
    await PropertyRecord.deleteMany({}).setOptions(SYSTEM);
  });
  /** @param {Record<string, unknown>} over */
  const live = async (over) => {
    const goa = /** @type {any} */ (await CityRecord.findOne({ slug: 'goa' }).lean());
    await PropertyRecord.insertMany([
      {
        hotelOrgId: 'h',
        publicRef: newReference('MBHT'),
        slug: `s-${Math.random().toString(36).slice(2)}`,
        name: 'Baga Sands Resort',
        propertyTypeKey: 'resort',
        status: 'LIVE',
        cityId: String(goa._id),
        createdBy: 't',
        updatedBy: 't',
        ...over,
      },
    ]);
  };

  it('public: cities and live hotels on the website; hidden or unpublished hotels never', async () => {
    await live({});
    await live({ name: 'Baga Hidden Inn', visibility: { website: false, b2b: true, clientCategories: [], sellFrom: null } });
    await live({ name: 'Baga Draft Stay', status: 'DRAFT' });
    const r = await app.srv.get('/api/v1/hotels/destinations?q=baga');
    expect(r.status).toBe(200);
    expect(r.body.data.map((/** @type {any} */ d) => d.name)).toEqual(['Baga Sands Resort']);
    expect(r.body.data[0]).toMatchObject({ type: 'PROPERTY', cityName: 'Goa', ref: expect.stringMatching(/^MBHT-/) });
    const goa = await app.srv.get('/api/v1/hotels/destinations?q=go');
    expect(goa.body.data[0]).toMatchObject({ type: 'CITY', name: 'Goa', popularity: 1 });
    expect(r.headers.get('ratelimit-limit')).toBe('120');
  });

  it('a B2B client sees B2B-visible hotels; hotels and clients without the permission are refused', async () => {
    await live({ name: 'Baga Hidden Inn', visibility: { website: false, b2b: true, clientCategories: [], sellFrom: null } });
    const owner = await app.users.create({ email: 'owner@trips.in', name: 'O', password: PASSWORD });
    const org = await app.orgs.createOrganization({
      type: 'CLIENT',
      legalName: 'Trips',
      ownerUserId: owner.id,
      status: 'ACTIVE',
      createdBy: 's',
    });
    const token = await app.login('owner@trips.in');
    const r = await app.srv.get('/api/v1/hotels/destinations?q=baga', auth(token));
    expect(r.body.data.map((/** @type {any} */ d) => d.name)).toEqual(['Baga Hidden Inn']);
    const viewer = await app.staff(org.id, 'viewer@trips.in', 'client.viewer');
    expect((await app.srv.get('/api/v1/hotels/destinations?q=baga', auth(viewer))).status).toBe(403);
    const hotel = await app.hotelWithProperty('owner@seaview.in');
    expect((await app.srv.get('/api/v1/hotels/destinations?q=baga', auth(hotel.token))).status).toBe(403);
  });

  it('a client organisation that is not active is refused', async () => {
    const owner = await app.users.create({ email: 'owner@new.in', name: 'O', password: PASSWORD });
    await app.orgs.createOrganization({ type: 'CLIENT', legalName: 'New Co', ownerUserId: owner.id, status: 'ONBOARDING', createdBy: 's' });
    const r = await app.srv.get('/api/v1/hotels/destinations?q=goa', auth(await app.login('owner@new.in')));
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('ORG_NOT_ACTIVE');
  });

  it('anonymous visitors are limited per IP (120 a minute), counted atomically under concurrency', async () => {
    const results = await Promise.all(Array.from({ length: 125 }, () => app.srv.get('/api/v1/hotels/destinations?q=go')));
    const codes = results.map((r) => r.status);
    expect(codes.filter((c) => c === 200)).toHaveLength(120);
    expect(codes.filter((c) => c === 429)).toHaveLength(5);
  });

  it('extra query fields are refused', async () => {
    expect((await app.srv.get('/api/v1/hotels/destinations?q=go&x=1')).status).toBe(400);
  });
});
