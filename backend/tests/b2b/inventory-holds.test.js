// @ts-check
/**
 * Inventory primitives (S04-T08; plan §9, `05-…` §12): 100 parallel holds on 3 rooms → exactly 3; multi-night all
 * or nothing; repeat-safe hold / confirm / release / return; crash in the middle of confirming → finished forward;
 * a lost night → the booking's nights given back; extension once; SYSTEM only. After every test the counts of every
 * night match their owners and never exceed the rooms.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createContext, systemContext } from '../../src/b2b/core/context.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createHoldService, ensureNights, HoldRecord, InventoryDayRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-11-17T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '64b0000000000000000000aa';
const P = { hotelOrgId: ORG, propertyId: 'p1' };
const quiet = createLogger({ write: () => {} });
const sys = systemContext('booking engine (test)', 'req-test', quiet);
const holds = createHoldService({ clock });

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  now = new Date('2026-11-17T10:00:00Z');
  await Promise.all([InventoryDayRecord.deleteMany({}).setOptions(SYSTEM), HoldRecord.deleteMany({}).setOptions(SYSTEM)]);
});
afterEach(async () => {
  for (const n of await InventoryDayRecord.find({ hotelOrgId: ORG }).lean()) {
    expect(n.held).toBe(n.holds.reduce((s, h) => s + h.qty, 0));
    expect(n.booked).toBe(n.bookings.reduce((s, b) => s + b.qty, 0));
    expect(n.booked + n.held).toBeLessThanOrEqual(n.total);
  }
});

/** Nights with rooms. @param {string} roomTypeId @param {Record<string, number>} totals */
async function rooms(roomTypeId, totals) {
  await ensureNights({ ...P, roomTypeIds: [roomTypeId], dates: Object.keys(totals) });
  for (const [date, total] of Object.entries(totals))
    await InventoryDayRecord.updateOne({ hotelOrgId: ORG, roomTypeId, date }, { $set: { total } });
}
/** @param {string} roomTypeId @param {string} date */
const night = async (roomTypeId, date) =>
  /** @type {any} */ (await InventoryDayRecord.findOne({ hotelOrgId: ORG, roomTypeId, date }).lean());
/** @param {string} orderId @param {string[]} dates @param {number} [qty] */
const hold = (orderId, dates, qty = 1) => holds.holdRooms(sys, { ...P, orderId, lines: [{ roomTypeId: 'r1', qty, dates }] });

describe('holding rooms', () => {
  it('100 checkouts at the same moment for the last 3 rooms: exactly 3 get them, 97 are told sold out', async () => {
    await rooms('r1', { '2026-12-31': 3 });
    const results = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => hold(`order-${i}`, ['2026-12-31'])));
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected');
    expect(won).toHaveLength(3);
    expect(lost.every((r) => /** @type {any} */ (r).reason.code === 'SOLD_OUT')).toBe(true);
    expect(await night('r1', '2026-12-31')).toMatchObject({ total: 3, held: 3, booked: 0 });
    expect(await HoldRecord.countDocuments({ status: 'ACTIVE' }).setOptions(SYSTEM)).toBe(3);
  });

  it('all nights or nothing: night 2 sold out → night 1 is given back at once and the hold fails with the night', async () => {
    await rooms('r1', { '2026-12-01': 2, '2026-12-02': 0, '2026-12-03': 2 });
    await expect(hold('order-1', ['2026-12-01', '2026-12-02', '2026-12-03'])).rejects.toMatchObject({
      code: 'SOLD_OUT',
      details: { roomTypeId: 'r1', date: '2026-12-02' },
    });
    expect(await night('r1', '2026-12-01')).toMatchObject({ held: 0, holds: [] });
    expect((await HoldRecord.findOne({ orderId: 'order-1' }).setOptions(SYSTEM).lean())?.status).toBe('FAILED');
    await expect(hold('order-1', ['2026-12-01', '2026-12-02', '2026-12-03'])).rejects.toMatchObject({ code: 'SOLD_OUT' }); // repeat → same answer
  });

  it('a repeated request for the same order returns the same hold (no second set of rooms); stop-sold nights cannot be held', async () => {
    await rooms('r1', { '2026-12-05': 5, '2026-12-06': 5 });
    const a = await hold('order-1', ['2026-12-05', '2026-12-06'], 2);
    const b = await hold('order-1', ['2026-12-05', '2026-12-06'], 2);
    expect([a.status, b.id]).toEqual(['ACTIVE', a.id]);
    expect(await night('r1', '2026-12-05')).toMatchObject({ held: 2 });
    await InventoryDayRecord.updateOne({ hotelOrgId: ORG, roomTypeId: 'r1', date: '2026-12-06' }, { $set: { stopSell: true } });
    await expect(hold('order-2', ['2026-12-06'])).rejects.toMatchObject({ code: 'SOLD_OUT' });
  });
});

describe('confirming, releasing, returning', () => {
  it('confirm turns held into booked (repeat-safe); release after confirm does nothing; return gives the rooms back once', async () => {
    await rooms('r1', { '2026-12-10': 4, '2026-12-11': 4 });
    const h = await hold('order-1', ['2026-12-10', '2026-12-11'], 2);
    const c1 = await holds.confirmHold(sys, { holdId: h.id, bookingId: 'booking-1' });
    const c2 = await holds.confirmHold(sys, { holdId: h.id, bookingId: 'booking-1' });
    expect([c1.status, c2.status]).toEqual(['CONFIRMED', 'CONFIRMED']);
    expect(await night('r1', '2026-12-10')).toMatchObject({ held: 0, booked: 2, bookings: [{ bookingId: 'booking-1', qty: 2 }] });
    expect(await holds.releaseHold(sys, h.id)).toEqual({ released: false, status: 'CONFIRMED' });
    const lines = [{ roomTypeId: 'r1', qty: 2, dates: ['2026-12-10', '2026-12-11'] }];
    await holds.returnRooms(sys, { bookingId: 'booking-1', lines });
    await holds.returnRooms(sys, { bookingId: 'booking-1', lines });
    expect(await night('r1', '2026-12-11')).toMatchObject({ booked: 0, bookings: [] });
  });

  it('release twice returns the rooms exactly once; a released hold cannot be confirmed', async () => {
    await rooms('r1', { '2026-12-12': 2 });
    const h = await hold('order-1', ['2026-12-12'], 2);
    expect(await holds.releaseHold(sys, h.id)).toEqual({ released: true, status: 'RELEASED' });
    expect(await holds.releaseHold(sys, h.id)).toEqual({ released: false, status: 'RELEASED' });
    expect(await night('r1', '2026-12-12')).toMatchObject({ held: 0, holds: [] });
    await expect(holds.confirmHold(sys, { holdId: h.id, bookingId: 'b' })).rejects.toMatchObject({ code: 'HOLD_NOT_ACTIVE' });
  });

  it('crash in the middle of confirming (one night done): running it again finishes forward', async () => {
    await rooms('r1', { '2026-12-14': 2, '2026-12-15': 2 });
    const h = await hold('order-1', ['2026-12-14', '2026-12-15']);
    // what a process that died after night 1 leaves behind
    await HoldRecord.updateOne({ _id: h.id }, { $set: { status: 'CONFIRMING', bookingId: 'booking-1' } }).setOptions(SYSTEM);
    await InventoryDayRecord.updateOne(
      { hotelOrgId: ORG, roomTypeId: 'r1', date: '2026-12-14' },
      { $inc: { held: -1, booked: 1 }, $pull: { holds: { holdId: h.id } }, $push: { bookings: { bookingId: 'booking-1', qty: 1 } } },
    );
    const done = await holds.confirmHold(sys, { holdId: h.id, bookingId: 'booking-1' });
    expect(done.status).toBe('CONFIRMED');
    for (const d of ['2026-12-14', '2026-12-15']) expect(await night('r1', d)).toMatchObject({ held: 0, booked: 1 });
  });

  it("a lost hold night is taken again when free; when the room is gone, the booking's nights go back and the hold fails", async () => {
    await rooms('r1', { '2026-12-20': 1, '2026-12-21': 1 });
    const h = await hold('order-1', ['2026-12-20', '2026-12-21']);
    const swept = async () =>
      InventoryDayRecord.updateOne(
        { hotelOrgId: ORG, roomTypeId: 'r1', date: '2026-12-21' },
        { $inc: { held: -1 }, $pull: { holds: { holdId: h.id } } },
      );
    await swept(); // the night's hold entry disappeared, the room is still free
    expect((await holds.confirmHold(sys, { holdId: h.id, bookingId: 'booking-1' })).status).toBe('CONFIRMED');

    await rooms('r1', { '2026-12-23': 1, '2026-12-24': 1 });
    const h3 = await hold('order-3', ['2026-12-23', '2026-12-24']);
    await InventoryDayRecord.updateOne(
      { hotelOrgId: ORG, roomTypeId: 'r1', date: '2026-12-24' },
      { $inc: { held: -1, booked: 1 }, $pull: { holds: { holdId: h3.id } }, $push: { bookings: { bookingId: 'someone-else', qty: 1 } } },
    ); // the room went to another booking
    await expect(holds.confirmHold(sys, { holdId: h3.id, bookingId: 'booking-3' })).rejects.toMatchObject({
      code: 'NIGHT_LOST',
      details: { nights: [{ roomTypeId: 'r1', date: '2026-12-24' }] },
    });
    expect(await night('r1', '2026-12-23')).toMatchObject({ held: 0, booked: 0 });
    expect((await HoldRecord.findById(h3.id).setOptions(SYSTEM).lean())?.status).toBe('FAILED');
  });
});

describe('extension and access', () => {
  it('extends once by 10 minutes (also on every night entry); a second time is refused', async () => {
    await rooms('r1', { '2026-12-26': 1 });
    const h = await hold('order-1', ['2026-12-26']);
    const ext = await holds.extendHold(sys, h.id);
    expect(new Date(ext.expiresAt).toISOString()).toBe('2026-11-17T10:25:00.000Z');
    expect(new Date((await night('r1', '2026-12-26')).holds[0].expiresAt).toISOString()).toBe('2026-11-17T10:25:00.000Z');
    await expect(holds.extendHold(sys, h.id)).rejects.toMatchObject({ code: 'HOLD_NOT_EXTENDABLE' });
  });

  it('only the system (booking engine) may call the primitives; bad lines are refused', async () => {
    const member = createContext({
      requestId: 'r',
      channel: 'B2B_PORTAL',
      logger: quiet,
      actor: /** @type {any} */ ({ type: 'member', userId: 'u', orgId: ORG, permissions: ['**'] }),
    });
    await expect(
      holds.holdRooms(member, { ...P, orderId: 'x', lines: [{ roomTypeId: 'r1', qty: 1, dates: ['2026-12-01'] }] }),
    ).rejects.toMatchObject({ code: 'INVENTORY_SYSTEM_ONLY' });
    await expect(hold('x', ['2026-02-30'])).rejects.toMatchObject({ code: 'HOLD_LINES_INVALID' });
    await expect(hold('y', ['2026-12-01'], 0)).rejects.toMatchObject({ code: 'HOLD_LINES_INVALID' });
  });
});
