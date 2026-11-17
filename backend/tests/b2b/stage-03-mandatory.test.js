// @ts-check
/**
 * Stage 03 mandatory tests (plan Stage 03 §8, §7). This file holds what was not covered elsewhere:
 * tenant isolation for the Stage 03 owned collections (platform-wide master lists classified on purpose),
 * the description "XSS payload" test, and crash injection for photo uploads (files stored, record fails).
 * The rest of the list lives in:
 * - listing state machine (every pair) and submit rules → hotel-listing.test.js
 * - revision rules (sensitive vs direct; approve only the revision seen) → hotel-revisions.test.js
 * - visibility per channel on the public endpoint → hotel-content.test.js
 * - photo sizes + camera / GPS (EXIF) refusal → hotel-photos.test.js
 * - admin decisions, duplicates within 200 m, own-organisation guard → hotel-admin-listing.test.js
 * - property limits for staff (properties, room types, photos, notifications) → hotel-properties / hotel-room-types /
 *   hotel-photos / hotel-listing-notifications tests
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLocalPublicStore } from '../../src/b2b/modules/files/index.js';
import {
  AmenityRecord,
  BedTypeRecord,
  CityRecord,
  createContentService,
  createPhotoService,
  createPropertyService,
  MealPlanRecord,
  PropertyRecord,
  PropertyTypeRecord,
  RoomTypeRecord,
  seedMasters,
} from '../../src/b2b/modules/hotel-catalog/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { PLACEHOLDER, sizes } from './helpers/images.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const A = '64b0000000000000000000aa';
const B = '64b0000000000000000000bb';

/**
 * Every Stage 03 collection owned by a hotel org: the model, its owner field, and a valid document.
 * @type {[string, import('mongoose').Model<any>, string, (owner: string) => Record<string, unknown>][]}
 */
const OWNED = [
  [
    'htl_properties',
    PropertyRecord,
    'hotelOrgId',
    (o) => ({
      hotelOrgId: o,
      publicRef: `MBHT-${o.slice(-6).toUpperCase()}`,
      slug: `p-${o}`,
      name: 'Hotel',
      propertyTypeKey: 'hotel',
      createdBy: 'u',
      updatedBy: 'u',
    }),
  ],
  [
    'htl_room_types',
    RoomTypeRecord,
    'hotelOrgId',
    (o) => ({
      hotelOrgId: o,
      propertyId: `p-${o}`,
      name: 'Deluxe',
      nameKey: 'deluxe',
      maxAdults: 2,
      maxChildren: 0,
      maxOccupancy: 2,
      createdBy: 'u',
      updatedBy: 'u',
    }),
  ],
];
/** Platform-wide on purpose: the master lists everyone reads and MusafirBaba manages. */
const PLATFORM_WIDE = ['htl_cities', 'htl_amenities', 'htl_property_types', 'htl_bed_types', 'htl_meal_plans'];

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  for (const [, model, , doc] of OWNED) await model.insertMany([doc(A), doc(B)]);
});
afterAll(async () => mongo.stop());

describe('tenant isolation — every Stage 03 owned collection', () => {
  it.each(OWNED)('%s: unscoped reads and writes are refused', async (_name, model) => {
    await expect(model.find({}).lean()).rejects.toThrow(/no ownership filter/);
    await expect(model.countDocuments({})).rejects.toThrow(/no ownership filter/);
    await expect(model.updateMany({}, { $set: { updatedAt: new Date() } })).rejects.toThrow(/no ownership filter/);
    await expect(model.deleteMany({})).rejects.toThrow(/no ownership filter/);
  });

  it.each(OWNED)("%s: a scoped query sees only that owner's documents", async (_name, model, field) => {
    const docs = await model.find({ [field]: A }).lean();
    expect(docs.length).toBeGreaterThan(0);
    for (const d of docs) expect(String(/** @type {any} */ (d)[field])).toBe(A);
  });

  it('every htl_ collection is classified: owned (above) or platform-wide on purpose', () => {
    const classified = new Set([...OWNED.map(([name]) => name), ...PLATFORM_WIDE]);
    const stage03 = Object.values(b2bMongoose.models)
      .map((m) => m.collection.collectionName)
      .filter((n) => n.startsWith('htl_'));
    expect(stage03.filter((n) => !classified.has(n))).toEqual([]);
    for (const model of [CityRecord, AmenityRecord, PropertyTypeRecord, BedTypeRecord, MealPlanRecord])
      expect(PLATFORM_WIDE).toContain(model.collection.collectionName);
  });
});

describe('descriptions are plain text (XSS payload)', () => {
  it('markup is stored and served exactly as typed — never turned into page code by the server', async () => {
    await seedMasters();
    const payload = '<script>alert(1)</script><img src=x onerror=alert(2)> Sea view & "quotes"';
    await PropertyRecord.updateOne(
      { hotelOrgId: A },
      {
        $set: {
          status: 'LIVE',
          description: payload,
          propertyTypeKey: 'hotel',
          timeZone: 'Asia/Kolkata',
          visibility: { website: true, b2b: true, clientCategories: [], sellFrom: null },
        },
      },
    );
    const content = createContentService({ clock, mediaUrl: (k) => k });
    const p = await content.publicProperty(`p-${A}`, { channel: 'WEBSITE' }); // by slug (the test reference has no valid check character)
    expect(p.description).toBe(payload); // returned as data (JSON); the website renders it as text, which escapes it
  });
});

describe('photo upload interrupted after the files were stored', () => {
  it('the files are removed again when the record cannot be written', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'b2b-crash-'));
    try {
      const real = createLocalPublicStore({ dir, baseUrl: 'http://x' });
      let puts = 0;
      /** a store whose third write happens just as MusafirBaba archives the listing */
      const store = {
        ...real,
        /** @param {string} key @param {Buffer} bytes @param {string} type */
        async put(key, bytes, type) {
          await real.put(key, bytes, type);
          puts += 1;
          if (puts === 3) await PropertyRecord.updateOne({ hotelOrgId: B }, { $set: { status: 'ARCHIVED' } });
        },
      };
      const ctx = /** @type {any} */ ({
        actor: {
          type: 'member',
          userId: 'u',
          orgId: B,
          orgType: 'HOTEL',
          roles: ['hotel.owner'],
          permissions: ['hotel-catalog.property.manage', 'hotel-catalog.property.read'],
          branchIds: [],
          propertyIds: [],
        },
      });
      const properties = createPropertyService({ clock });
      const photos = createPhotoService({ properties, store, clock });
      const id = String((await PropertyRecord.findOne({ hotelOrgId: B }).lean())?._id);
      await expect(
        photos.add(ctx, id, { files: sizes(), placeholder: PLACEHOLDER, category: 'EXTERIOR', caption: null, roomTypeId: null }),
      ).rejects.toMatchObject({ code: 'PROPERTY_NOT_EDITABLE' });
      expect((await readdir(dir, { recursive: true })).filter((f) => String(f).endsWith('.webp'))).toEqual([]);
      expect((await PropertyRecord.findOne({ hotelOrgId: B }).lean())?.photos).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
