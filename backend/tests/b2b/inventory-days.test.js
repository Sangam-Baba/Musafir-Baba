// @ts-check
/**
 * Inventory days (S04-T04): the database rule (validator) refuses impossible counts even from a raw script;
 * nights are created with 0 rooms, repeat-safe and race-safe, never overwritten; the nightly job keeps the
 * calendar 365 days ahead; unscoped access is refused.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { ensureNights, extendCalendarWindow } from '../../src/b2b/modules/hotel-inventory/inventory-days.js';
import { INVENTORY_DAYS_COLLECTION, InventoryDayRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '64b0000000000000000000aa';
const night = { hotelOrgId: ORG, propertyId: 'p1', roomTypeId: 'r1', date: '2026-12-24', stopSell: false };

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/**
 * @typedef {{ hotelOrgId: string, propertyId: string, roomTypeId: string, date: string, stopSell: boolean, total: number,
 *   booked: number, held: number, holds: { holdId: string, qty: number, expiresAt: Date }[], bookings: { bookingId: string, qty: number }[] }} NightDoc
 */
/** @returns {import('mongodb').Collection<NightDoc>} */
const raw = () => mongo.db.collection(INVENTORY_DAYS_COLLECTION);

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await InventoryDayRecord.deleteMany({}).setOptions(SYSTEM);
});

/** @param {Promise<unknown>} p */
const refused = async (p) => expect(p).rejects.toMatchObject({ code: 121 }); // MongoDB "document failed validation"

describe('the database rule (validator)', () => {
  it('accepts consistent counts', async () => {
    await raw().insertOne({
      ...night,
      total: 3,
      booked: 1,
      held: 2,
      holds: [{ holdId: 'h1', qty: 2, expiresAt: new Date() }],
      bookings: [{ bookingId: 'b1', qty: 1 }],
    });
    expect(await raw().countDocuments({})).toBe(1);
  });

  it('refuses booked + held above total, negative counts, and counts that do not match their owners — even from a raw script', async () => {
    await refused(
      raw().insertOne({
        ...night,
        total: 2,
        booked: 2,
        held: 1,
        holds: [{ holdId: 'h', qty: 1, expiresAt: new Date() }],
        bookings: [{ bookingId: 'b', qty: 2 }],
      }),
    );
    await refused(raw().insertOne({ ...night, total: 2, booked: -1, held: 0, holds: [], bookings: [] }));
    await refused(raw().insertOne({ ...night, total: 2, booked: 0, held: 1, holds: [], bookings: [] }));
    await refused(raw().insertOne({ ...night, total: 2, booked: 1, held: 0, holds: [], bookings: [] }));
    await raw().insertOne({ ...night, total: 1, booked: 0, held: 0, holds: [], bookings: [] });
    // the last room twice: the second write breaks the rule and is refused
    await raw().updateOne({ roomTypeId: 'r1' }, { $inc: { held: 1 }, $push: { holds: { holdId: 'h1', qty: 1, expiresAt: new Date() } } });
    await refused(
      raw().updateOne({ roomTypeId: 'r1' }, { $inc: { held: 1 }, $push: { holds: { holdId: 'h2', qty: 1, expiresAt: new Date() } } }),
    );
    await refused(raw().updateOne({ roomTypeId: 'r1' }, { $set: { total: 0 } }));
    expect(await raw().findOne({ roomTypeId: 'r1' })).toMatchObject({ total: 1, held: 1 });
  });

  it('one night per room type and date', async () => {
    await raw().insertOne({ ...night, total: 0, booked: 0, held: 0, holds: [], bookings: [] });
    await expect(raw().insertOne({ ...night, total: 0, booked: 0, held: 0, holds: [], bookings: [] })).rejects.toMatchObject({
      code: 11000,
    });
  });
});

describe('creating nights', () => {
  const dates = ['2026-12-01', '2026-12-02', '2026-12-03'];

  it('with 0 rooms; repeat-safe; an existing night is never overwritten', async () => {
    expect(await ensureNights({ hotelOrgId: ORG, propertyId: 'p1', roomTypeIds: ['r1', 'r2'], dates })).toBe(6);
    await InventoryDayRecord.updateOne({ hotelOrgId: ORG, roomTypeId: 'r1', date: '2026-12-02' }, { $set: { total: 5 } });
    expect(await ensureNights({ hotelOrgId: ORG, propertyId: 'p1', roomTypeIds: ['r1', 'r2'], dates })).toBe(0);
    const docs = await InventoryDayRecord.find({ hotelOrgId: ORG }).sort({ roomTypeId: 1, date: 1 }).lean();
    expect(docs.map((d) => [d.roomTypeId, d.date, d.total, d.booked, d.held])).toEqual([
      ['r1', '2026-12-01', 0, 0, 0],
      ['r1', '2026-12-02', 5, 0, 0],
      ['r1', '2026-12-03', 0, 0, 0],
      ['r2', '2026-12-01', 0, 0, 0],
      ['r2', '2026-12-02', 0, 0, 0],
      ['r2', '2026-12-03', 0, 0, 0],
    ]);
  });

  it('several processes at once still make each night exactly once', async () => {
    await Promise.all(Array.from({ length: 6 }, () => ensureNights({ hotelOrgId: ORG, propertyId: 'p1', roomTypeIds: ['r1'], dates })));
    expect(await InventoryDayRecord.countDocuments({ hotelOrgId: ORG })).toBe(3);
  });

  it('the nightly job keeps every known room type 365 days ahead (plus a day for time zones); up-to-date ones are left alone', async () => {
    await ensureNights({ hotelOrgId: ORG, propertyId: 'p1', roomTypeIds: ['r1'], dates: ['2026-11-17', '2026-11-18'] });
    await ensureNights({ hotelOrgId: ORG, propertyId: 'p1', roomTypeIds: ['r2'], dates: ['2027-11-18'] });
    expect(await extendCalendarWindow({ clock })).toEqual({ roomTypes: 1, created: 365 });
    const last = await InventoryDayRecord.find({ hotelOrgId: ORG, roomTypeId: 'r1' }).sort({ date: -1 }).limit(1).lean();
    expect(last[0]?.date).toBe('2027-11-18');
    expect(await extendCalendarWindow({ clock })).toEqual({ roomTypes: 0, created: 0 });
  });

  it('unscoped reads and writes are refused (tenant guard)', async () => {
    await expect(InventoryDayRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
    await expect(InventoryDayRecord.updateMany({ date: '2026-12-01' }, { $set: { stopSell: true } })).rejects.toThrow(
      /no ownership filter/,
    );
  });
});
