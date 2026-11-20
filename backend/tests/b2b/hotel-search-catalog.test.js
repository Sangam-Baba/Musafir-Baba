// @ts-check
/** Search read model (S06-T02): LIVE + channel-visible only; by city / area / distance / reference; facts for search. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { newReference } from '../../src/b2b/core/ids.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createSearchCatalog, PropertyRecord, RoomTypeRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const GOA = '64b0000000000000000000c1';
const JAIPUR = '64b0000000000000000000c2';
const ORG = '64b0000000000000000000aa';
const BAGA = { lat: 15.5553, lng: 73.7517 };
let n = 0;

/** @param {Record<string, unknown>} [over] */
async function listing(over = {}) {
  n += 1;
  const [p] = await PropertyRecord.insertMany([
    {
      hotelOrgId: ORG,
      publicRef: newReference('MBHT'),
      slug: `hotel-${n}`,
      name: `Hotel ${n}`,
      propertyTypeKey: 'hotel',
      status: 'LIVE',
      cityId: GOA,
      stateCode: '30',
      starRating: 3,
      location: { type: 'Point', coordinates: [BAGA.lng, BAGA.lat] },
      amenities: ['wifi'],
      createdBy: 't',
      updatedBy: 't',
      ...over,
    },
  ]);
  const id = String(p?._id);
  await RoomTypeRecord.insertMany([
    {
      hotelOrgId: ORG,
      propertyId: id,
      name: 'Deluxe',
      nameKey: `deluxe-${n}`,
      status: 'ACTIVE',
      maxAdults: 2,
      maxChildren: 1,
      maxOccupancy: 3,
      order: 1,
      beds: [{ bedTypeKey: 'king', count: 1 }],
      sizeSqm: 20,
      createdBy: 't',
      updatedBy: 't',
    },
    {
      hotelOrgId: ORG,
      propertyId: id,
      name: 'Old room',
      nameKey: `old-${n}`,
      status: 'ARCHIVED',
      maxAdults: 2,
      maxChildren: 0,
      maxOccupancy: 2,
      order: 2,
      beds: [{ bedTypeKey: 'king', count: 1 }],
      sizeSqm: 20,
      createdBy: 't',
      updatedBy: 't',
    },
  ]);
  return { id, ref: /** @type {string} */ (p?.publicRef) };
}

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const catalog = createSearchCatalog({ clock, mediaUrl: (k) => `https://cdn.test/${k}` });
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await PropertyRecord.deleteMany({}).setOptions(SYSTEM);
  await RoomTypeRecord.deleteMany({}).setOptions(SYSTEM);
});

describe('who appears', () => {
  it('only LIVE listings visible on the channel (website / B2B switches, sell-from date, client categories)', async () => {
    const live = await listing();
    await listing({ status: 'SUBMITTED' });
    await listing({ status: 'SUSPENDED' });
    const b2bOnly = await listing({ visibility: { website: false, b2b: true, clientCategories: [], sellFrom: null } });
    await listing({ visibility: { website: true, b2b: true, clientCategories: [], sellFrom: '2026-12-01' } });
    const gold = await listing({ visibility: { website: true, b2b: true, clientCategories: ['GOLD'], sellFrom: null } });
    const ids = async (/** @type {any} */ q) => (await catalog.candidates({ where: { cityId: GOA }, ...q })).map((p) => p.id).sort();
    expect(await ids({ channel: 'WEBSITE' })).toEqual([live.id, gold.id].sort());
    expect(await ids({ channel: 'B2B', clientCategory: 'SILVER' })).toEqual([live.id, b2bOnly.id].sort());
    expect(await ids({ channel: 'B2B', clientCategory: 'GOLD' })).toEqual([live.id, b2bOnly.id, gold.id].sort());
  });

  it('by city and area; other cities never mix in', async () => {
    const a = await listing({ areaId: 'baga' });
    await listing({ areaId: 'calangute' });
    await listing({ cityId: JAIPUR, stateCode: '08' });
    expect((await catalog.candidates({ channel: 'WEBSITE', where: { cityId: GOA, areaId: 'baga' } })).map((p) => p.id)).toEqual([a.id]);
    expect(await catalog.candidates({ channel: 'WEBSITE', where: { cityId: GOA } })).toHaveLength(2);
  });

  it('near a point: within the radius, with the distance, nearest first', async () => {
    const near = await listing({ location: { type: 'Point', coordinates: [BAGA.lng + 0.01, BAGA.lat] } }); // ~1 km
    const far = await listing({ location: { type: 'Point', coordinates: [BAGA.lng + 0.1, BAGA.lat] } }); // ~10.7 km
    const r = await catalog.candidates({ channel: 'WEBSITE', where: { near: { ...BAGA, radiusKm: 5 } } });
    expect(r.map((p) => p.id)).toEqual([near.id]);
    expect(r[0]?.distanceKm).toBeCloseTo(1.1, 0);
    const wide = await catalog.candidates({ channel: 'WEBSITE', where: { near: { ...BAGA, radiusKm: 20 } } });
    expect(wide.map((p) => p.id)).toEqual([near.id, far.id]);
  });

  it('by public reference (spelling-tolerant), still only visible ones', async () => {
    const a = await listing();
    const hidden = await listing({ status: 'DRAFT' });
    const r = await catalog.candidates({ channel: 'WEBSITE', where: { refs: [a.ref.toLowerCase(), hidden.ref, 'nonsense'] } });
    expect(r.map((p) => p.id)).toEqual([a.id]);
  });
});

describe('what comes back', () => {
  it('facts for availability, GST and filters — active room types only; nothing private', async () => {
    const a = await listing({
      photos: [
        {
          category: 'EXTERIOR',
          isCover: true,
          order: 1,
          variants: { card: { key: 'b2b-public/x/card.webp' } },
          placeholder: 'p',
          uploadedBy: 'u',
          uploadedAt: clock.now(),
        },
      ],
    });
    const [p] = await catalog.candidates({ channel: 'WEBSITE', where: { cityId: GOA } });
    expect(p).toMatchObject({
      id: a.id,
      stateCode: '30',
      starRating: 3,
      timeZone: 'Asia/Kolkata',
      amenities: ['wifi'],
      coverUrl: 'https://cdn.test/b2b-public/x/card.webp',
      location: BAGA,
    });
    expect(p?.roomTypes).toEqual([{ id: expect.any(String), name: 'Deluxe', maxAdults: 2, maxChildren: 1, maxOccupancy: 3 }]);
    expect(JSON.stringify(p)).not.toMatch(/contacts|gstin|review|history/);
  });

  it('never more than 200 candidates', async () => {
    await PropertyRecord.insertMany(
      Array.from({ length: 205 }, (_, i) => ({
        hotelOrgId: ORG,
        publicRef: newReference('MBHT'),
        slug: `bulk-${i}`,
        name: `Bulk ${i}`,
        propertyTypeKey: 'hotel',
        status: 'LIVE',
        cityId: GOA,
        createdBy: 't',
        updatedBy: 't',
        location: { type: 'Point', coordinates: [BAGA.lng, BAGA.lat] },
      })),
    );
    expect(await catalog.candidates({ channel: 'WEBSITE', where: { cityId: GOA } })).toHaveLength(200);
  });
});
