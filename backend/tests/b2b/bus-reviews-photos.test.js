// @ts-check
/**
 * Bus reviews and photos (S18-T11, B8b).
 * - reviews: only after the trip (booking COMPLETED), once per booking; the company replies; staff hide → the rating
 *   counts published reviews only;
 * - photos: stored under the company's public folder (keys the store accepts — hotel keys unchanged), shown with URLs on
 *   the bus, removed with their files; not on a retired bus; the public store refuses any other key.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BusBookingRecord, completeTrips, createBusReviews, ratingsOf } from '../../src/b2b/modules/bus-booking/index.js';
import { createBusPhotos, VehicleRecord } from '../../src/b2b/modules/bus-catalog/index.js';
import { isPublicKey } from '../../src/b2b/modules/files/index.js';
import { busEngine, OP } from './helpers/bus-engine.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-12-10T10:00:00Z');
const clock = { now: () => now };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof busEngine>>} */
let E;

beforeAll(async () => {
  mongo = await startMongo();
  E = await busEngine(clock);
});
afterAll(async () => mongo.stop());

describe('reviews', () => {
  it('after the trip, once; reply; hidden reviews leave the rating', async () => {
    const reviews = createBusReviews({ clock });
    const o = await E.paidOrder([{ no: 'L1', passenger: { name: 'Ravi Kumar', age: 30, gender: 'M' } }]);
    const booking = async () =>
      /** @type {any} */ (
        await BusBookingRecord.findOne({ orderId: String(o._id) })
          .setOptions(S)
          .lean()
      );
    await expect(reviews.submit(await booking(), 'user:u', { rating: 5 })).rejects.toMatchObject({ code: 'REVIEW_AFTER_TRIP' });
    now = new Date('2026-12-13T02:00:00Z');
    await completeTrips({ clock });
    const r = await reviews.submit(await booking(), 'user:u', { rating: 4, text: 'Clean bus, on time' });
    expect(r).toMatchObject({ rating: 4, authorName: 'Ravi', routeName: 'Kashmere Gate → Sindhi Camp', status: 'PUBLISHED' });
    await expect(reviews.submit(await booking(), 'user:u', { rating: 1 })).rejects.toMatchObject({ code: 'ALREADY_REVIEWED' });
    expect(await reviews.mine(await booking())).toMatchObject({ id: r.id });
    expect((await ratingsOf([OP])).get(OP)).toEqual({ average: 4, count: 1 });
    expect((await reviews.reply({ orgId: OP, userId: 'u' }, r.id, 'Thank you!')).reply).toMatchObject({ text: 'Thank you!' });
    await expect(reviews.reply({ orgId: '65f0000000000000000b9999', userId: 'x' }, r.id, 'not mine')).rejects.toMatchObject({
      code: 'REVIEW_NOT_FOUND',
    });
    await reviews.moderate('staff:a', r.id, { visible: false, note: 'personal details' });
    expect((await ratingsOf([OP])).get(OP)).toBeUndefined();
    expect(await reviews.queue({ status: 'HIDDEN' })).toEqual([
      expect.objectContaining({ id: r.id, moderation: expect.objectContaining({ note: 'personal details' }) }),
    ]);
  });
});

describe('photos', () => {
  it('stored under the company folder; listed with URLs; removed with files; retired refused', async () => {
    expect(isPublicKey('b2b-public/hotels/MBHT-7K3Q9X/64b000000000000000000001-gallery.webp')).toBe(true);
    expect(isPublicKey('b2b-public/buses/MBBO-4H8K2M/64b000000000000000000001-card.jpg')).toBe(true);
    expect(isPublicKey('b2b-public/buses/MBHT-7K3Q9X/64b000000000000000000001-card.jpg')).toBe(false);
    expect(isPublicKey('b2b-public/kyc/x.pdf')).toBe(false);
    /** @type {Map<string, Buffer>} */
    const files = new Map();
    const store = {
      kind: 'test',
      put: async (/** @type {string} */ k, /** @type {Buffer} */ b) => void files.set(k, b),
      remove: async (/** @type {string} */ k) => void files.delete(k),
      url: (/** @type {string} */ k) => `https://cdn.test/${k}`,
    };
    const photos = createBusPhotos({
      store,
      clock,
      checkPhoto: (f) => Object.fromEntries(Object.keys(f).map((k) => [k, { width: 800, height: 600, type: 'image/webp' }])),
      checkPlaceholder: (d) => d,
    });
    const bus = /** @type {any} */ (await VehicleRecord.findOne({ operatorOrgId: OP }).setOptions(S).lean());
    const who = { orgId: OP, userId: 'u', orgRef: 'MBBO-4H8K2M' };
    const { id } = await photos.add(who, String(bus._id), {
      files: { thumb: Buffer.from('a'), card: Buffer.from('b'), gallery: Buffer.from('c') },
      placeholder: 'data:image/webp;base64,AA==',
      category: 'OUTSIDE',
      caption: 'Front',
    });
    expect([...files.keys()].every((k) => isPublicKey(k) && k.startsWith('b2b-public/buses/MBBO-4H8K2M/'))).toBe(true);
    const saved = /** @type {any} */ (await VehicleRecord.findById(bus._id).setOptions(S).lean()).photos[0];
    expect(saved.variants.card.url).toMatch(/^https:\/\/cdn\.test\/b2b-public\/buses\/MBBO-4H8K2M\/[a-f0-9]{24}-card\.webp$/);
    await photos.remove(who, String(bus._id), id);
    expect(files.size).toBe(0);
    await expect(photos.remove({ orgId: '65f0000000000000000b9999' }, String(bus._id), id)).rejects.toMatchObject({
      code: 'BUS_NOT_FOUND',
    });
    await VehicleRecord.updateOne({ _id: bus._id }, { $set: { status: 'RETIRED' } }).setOptions(S);
    await expect(photos.add(who, String(bus._id), { files: {}, placeholder: '', category: 'OTHER' })).rejects.toMatchObject({
      code: 'BUS_NOT_EDITABLE',
    });
  });
});
