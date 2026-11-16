// @ts-check
/** Hotel photos (S03-T05, D32): sizes checked from the bytes, no camera / location data, public folder, cover, limits. */
import express from 'express';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import {
  checkPhoto,
  checkPlaceholder,
  imageInfo,
  PropertyRecord,
  RoomTypeRecord,
  seedMasters,
} from '../../src/b2b/modules/hotel-catalog/index.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'photos', 'test', 'secret', 'long-enough-12345'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };

/** @param {string} id @param {Buffer} data */
const chunk = (id, data) => {
  const head = Buffer.alloc(8);
  head.write(id, 0, 'latin1');
  head.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
};
/** @param {Buffer[]} chunks */
const riff = (chunks) => {
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
};
/** A header-valid lossy WebP of the given size (as a browser's canvas makes). @param {number} w @param {number} h */
const webp = (w, h) => {
  const vp8 = Buffer.alloc(30);
  Buffer.from([0x9d, 0x01, 0x2a]).copy(vp8, 3);
  vp8.writeUInt16LE(w, 6);
  vp8.writeUInt16LE(h, 8);
  return riff([chunk('VP8 ', vp8)]);
};
/** A WebP whose extended header says it carries EXIF (e.g. a camera file renamed). @param {number} w @param {number} h */
const webpWithExif = (w, h) => {
  const x = Buffer.alloc(10);
  x[0] = 0x08;
  x.writeUIntLE(w - 1, 4, 3);
  x.writeUIntLE(h - 1, 7, 3);
  return riff([chunk('VP8X', x), chunk('EXIF', Buffer.from('Exif\0\0GPS...', 'latin1'))]);
};
/** A JPEG header with the given size, optionally with an EXIF block. @param {number} w @param {number} h @param {boolean} [exif] */
const jpeg = (w, h, exif = false) => {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0', 'latin1'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const exifData = Buffer.from('Exif\0\0GPSDATA..', 'latin1');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, exifData.length + 2]), exifData]); // the length counts its own 2 bytes
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, ...(exif ? [app1] : []), sof, Buffer.from([0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])]);
};
const PLACEHOLDER = `data:image/webp;base64,${webp(16, 10).toString('base64')}`;
const sizes = () => ({ thumb: webp(320, 200), card: webp(640, 400), gallery: webp(1600, 1000) });

describe('photo checks (from the bytes)', () => {
  it('reads type and real size; refuses camera / location data, animation, other formats', () => {
    expect(imageInfo(webp(1600, 1000))).toMatchObject({ type: 'image/webp', width: 1600, height: 1000, metadata: false });
    expect(imageInfo(jpeg(1600, 1000))).toMatchObject({ type: 'image/jpeg', width: 1600, height: 1000, metadata: false });
    expect(imageInfo(webpWithExif(1600, 1000))?.metadata).toBe(true);
    expect(imageInfo(jpeg(1600, 1000, true))?.metadata).toBe(true);
    expect(imageInfo(Buffer.from('\x89PNG\r\n\x1a\nxxxxxxxx', 'latin1'))).toBeNull();
    expect(() => checkPhoto({ ...sizes(), gallery: webpWithExif(1600, 1000) })).toThrow(
      expect.objectContaining({ code: 'PHOTO_HAS_METADATA' }),
    );
    expect(() => checkPhoto({ ...sizes(), gallery: jpeg(1600, 1000, true) })).toThrow(
      expect.objectContaining({ code: 'PHOTO_HAS_METADATA' }),
    );
  });

  it('the large size is at least 1200 px; all sizes present and the same shape', () => {
    expect(Object.keys(checkPhoto(sizes()))).toEqual(['thumb', 'card', 'gallery']);
    expect(() => checkPhoto({ ...sizes(), gallery: webp(1000, 625) })).toThrow(expect.objectContaining({ code: 'PHOTO_TOO_SMALL' }));
    expect(() => checkPhoto({ thumb: webp(320, 200), gallery: webp(1600, 1000) })).toThrow(
      expect.objectContaining({ code: 'PHOTO_SIZE_MISSING' }),
    );
    expect(() => checkPhoto({ ...sizes(), card: webp(640, 640) })).toThrow(expect.objectContaining({ code: 'PHOTO_SIZES_DO_NOT_MATCH' }));
    expect(() => checkPhoto({ thumb: jpeg(320, 200), card: jpeg(640, 400), gallery: jpeg(1600, 1000) })).not.toThrow(); // browsers without WebP
    expect(checkPlaceholder(PLACEHOLDER)).toBe(PLACEHOLDER);
    expect(() => checkPlaceholder(`data:image/webp;base64,${webp(400, 250).toString('base64')}`)).toThrow(
      expect.objectContaining({ code: 'PHOTO_PLACEHOLDER_INVALID' }),
    );
  });
});

describe('uploading', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  let dir = '';
  const users = createUserRepository({ bcryptCost: 4, clock });
  const orgs = createOrganizationsService({ clock });
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    await seedMasters();
    dir = await mkdtemp(path.join(tmpdir(), 'b2b-photos-'));
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
      PropertyRecord.deleteMany({}).setOptions(SYSTEM),
      RoomTypeRecord.deleteMany({}).setOptions(SYSTEM),
      mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    ]);
  });

  /** @param {string} t */
  const auth = (t) => ({ authorization: `Bearer ${t}` });
  /** @param {string} email */
  const login = async (email) => (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, H)).body.accessToken;
  async function hotel() {
    const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
    const orgId = (
      await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, status: 'ACTIVE', createdBy: 's' })
    ).id;
    const token = await login('owner@seaview.in');
    const property = (await srv.post('/api/v1/hotel/properties', { name: 'Sea View', propertyTypeKey: 'hotel' }, auth(token))).body;
    return { token, orgId, property };
  }
  /** @param {string} token @param {string} propertyId @param {{ files?: Record<string, Buffer>, fields?: Record<string, string> }} [o] */
  async function upload(token, propertyId, o = {}) {
    const form = new globalThis.FormData();
    for (const [name, bytes] of Object.entries(o.files ?? sizes()))
      form.append(name, new globalThis.Blob([new Uint8Array(bytes)], { type: 'image/webp' }), `${name}.webp`);
    for (const [name, value] of Object.entries({ placeholder: PLACEHOLDER, category: 'EXTERIOR', ...(o.fields ?? {}) }))
      form.append(name, value);
    const res = await fetch(`${srv.base}/api/v1/hotel/properties/${propertyId}/photos`, {
      method: 'POST',
      headers: auth(token),
      body: form,
    });
    return { status: res.status, body: /** @type {any} */ (await res.json().catch(() => null)) };
  }
  const filesOnDisk = async () => (await readdir(dir, { recursive: true })).filter((f) => String(f).endsWith('.webp')).length;

  it('stores every size in the public folder; the first property photo is the cover; served locally', async () => {
    const { token, property } = await hotel();
    const res = await upload(token, property.id, { fields: { caption: 'Front entrance' } });
    expect(res.status).toBe(201);
    const [photo] = res.body.property.photos;
    expect(photo).toMatchObject({
      category: 'EXTERIOR',
      caption: 'Front entrance',
      isCover: true,
      roomTypeId: null,
      placeholder: PLACEHOLDER,
    });
    expect(photo.sizes.gallery).toMatchObject({ width: 1600, height: 1000 });
    expect(photo.sizes.gallery.url).toMatch(
      new RegExp(`^http://localhost:8000/api/v1/media/b2b-public/hotels/${property.publicRef}/[a-f0-9]{24}-gallery\\.webp$`),
    );
    expect(res.body.property.photoCounts).toEqual({ property: 1, perRoomType: {} });
    expect(await filesOnDisk()).toBe(3);

    const key = photo.sizes.thumb.url.replace('http://localhost:8000/api/v1/media/', '');
    const served = await fetch(`${srv.base}/api/v1/media/${key}`);
    expect([served.status, served.headers.get('content-type')]).toEqual([200, 'image/webp']);
    expect(Buffer.from(await served.arrayBuffer()).equals(sizes().thumb)).toBe(true);
    expect((await fetch(`${srv.base}/api/v1/media/b2b-private/${'a'.repeat(48)}`)).status).toBe(404); // never anything outside the public folder
  });

  it('refuses photos with location data and leaves nothing behind; room photos need a real room type', async () => {
    const { token, property } = await hotel();
    const before = await filesOnDisk();
    const exif = await upload(token, property.id, { files: { ...sizes(), gallery: webpWithExif(1600, 1000) } });
    expect([exif.status, exif.body.code, exif.body.variant]).toEqual([422, 'PHOTO_HAS_METADATA', 'gallery']);
    expect(await filesOnDisk()).toBe(before);
    expect((await upload(token, property.id, { fields: { roomTypeId: '64b000000000000000000000' } })).status).toBe(404);
    expect((await upload(token, property.id, { fields: { category: 'SELFIE' } })).status).toBe(400);
    expect((await upload(token, property.id, { files: { ...sizes(), extra: webp(10, 10) } })).body.code).toBe('PHOTO_UPLOAD_INVALID');
  });

  it('room type photos, captions and order; the cover is always a property photo; deleting removes the files', async () => {
    const { token, property } = await hotel();
    const room = (
      await srv.post(
        `/api/v1/hotel/properties/${property.id}/room-types`,
        {
          name: 'Deluxe',
          description: '',
          sizeSqm: 30,
          beds: [{ bedTypeKey: 'king', count: 1 }],
          maxAdults: 2,
          maxChildren: 1,
          maxOccupancy: 3,
          extraBeds: { allowed: false, max: 0 },
          amenities: [],
        },
        auth(token),
      )
    ).body;
    const first = (await upload(token, property.id)).body.photoId;
    const second = (await upload(token, property.id, { fields: { category: 'LOBBY' } })).body.photoId;
    const roomPhoto = (await upload(token, property.id, { fields: { category: 'ROOM', roomTypeId: room.id } })).body;
    expect(roomPhoto.property.photoCounts).toEqual({ property: 2, perRoomType: { [room.id]: 1 } });

    const url = (/** @type {string} */ id) => `/api/v1/hotel/properties/${property.id}/photos/${id}`;
    expect((await srv.patch(url(roomPhoto.photoId), { isCover: true }, auth(token))).body.code).toBe('COVER_MUST_BE_PROPERTY_PHOTO');
    await srv.patch(url(first), { order: 30 }, auth(token));
    const covered = (await srv.patch(url(second), { isCover: true, caption: 'Lobby' }, auth(token))).body;
    expect(covered.photos.filter((/** @type {any} */ p) => p.isCover).map((/** @type {any} */ p) => p.id)).toEqual([second]);
    expect(covered.photos.map((/** @type {any} */ p) => p.id)).toEqual([second, roomPhoto.photoId, first]); // by order: 10, 20, 30
    expect(covered.photos[0].caption).toBe('Lobby');

    const before = await filesOnDisk();
    expect((await srv.del(url(first), auth(token))).status).toBe(204);
    expect(await filesOnDisk()).toBe(before - 3);
    expect((await srv.del(url(first), auth(token))).status).toBe(404);
  });

  it("follows the property's limits and editable state", async () => {
    const { token, orgId, property } = await hotel();
    const other = (await srv.post('/api/v1/hotel/properties', { name: 'Hill View', propertyTypeKey: 'resort' }, auth(token))).body;
    const m = await users.create({ email: 'manager@seaview.in', name: 'M', password: PASSWORD });
    await orgs.addMember({ orgId, userId: m.id, roles: ['hotel.manager'], propertyIds: [property.id], addedBy: 's' });
    const manager = await login('manager@seaview.in');
    expect((await upload(manager, other.id)).status).toBe(404);
    expect((await upload(manager, property.id)).status).toBe(201);
    await PropertyRecord.updateOne({ _id: property.id, hotelOrgId: orgId }, { $set: { status: 'SUBMITTED' } });
    expect((await upload(token, property.id)).body.code).toBe('PROPERTY_NOT_EDITABLE');
  });
});
