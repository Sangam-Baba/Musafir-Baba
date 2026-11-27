// @ts-check
/**
 * Bus seat engine (S18-T07, plan Stage 18 §5 mandatory tests). A trip A → B → C → D (3 legs), seats L1–L4 (L4 ladies).
 * - part route: a seat sold A→B is still free B→D, not A→C; ladies-only seats only for women; several seats are all or
 *   nothing; online sale stopped → holds refused, counter blocks still work; departed at the boarding stop → refused,
 *   later stops still open; confirm → BOOKING; release gives the legs back;
 * - crash: a claim stuck in TAKING (seat taken, never finished) and an expired hold are given back by the sweeper;
 * - races: 500 buyers at once on overlapping seats and legs → on every seat `taken` = OR of its entries, entries never
 *   overlap, every winner holds all its seats, every loser none; 100 counter blocks vs 100 holds on one seat → one wins.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { legMask } from '../../src/b2b/modules/bus-catalog/index.js';
import {
  ClaimRecord,
  createClaims,
  entriesOverlap,
  maskOf,
  TripRecord,
  TripSeatRecord,
} from '../../src/b2b/modules/bus-inventory/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-12-10T10:00:00Z');
const clock = { now: () => now };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const OP = { orgId: '65f0000000000000000b1831', userId: '65f0000000000000000c1831' };
const OTHER = { orgId: '65f0000000000000000b1832', userId: '65f0000000000000000c1832' };
const STOPS = ['a', 'b', 'c', 'd'].map((x, i) => ({
  stopId: `65f00000000000000000000${i}`,
  cityId: `city-${x}`,
  name: x.toUpperCase(),
  at: new Date(Date.parse('2026-12-12T16:30:00Z') + i * 3_600_000),
  boarding: i < 3,
  dropping: i > 0,
}));
const [A, B, C, D] = /** @type {[string, string, string, string]} */ (STOPS.map((s) => s.stopId));
const claims = createClaims({ clock });
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {string} */
let tripId;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  now = new Date('2026-12-10T10:00:00Z');
  for (const M of [TripRecord, TripSeatRecord, ClaimRecord]) await /** @type {any} */ (M).deleteMany({}).setOptions(S);
  const trip = await TripRecord.create({
    operatorOrgId: OP.orgId,
    scheduleId: 's1',
    routeId: 'r1',
    vehicleId: 'v1',
    layoutId: 'l1',
    date: '2026-12-12',
    stops: STOPS,
    fromCityId: 'city-a',
    toCityId: 'city-d',
    departAt: STOPS[0]?.at,
    arriveAt: STOPS[3]?.at,
    legs: 3,
    decks: [{ deck: 'LOWER', rows: 1, cols: 4 }],
    seatCount: 4,
    seatsReady: true,
  });
  tripId = String(trip._id);
  await TripSeatRecord.insertMany(
    ['L1', 'L2', 'L3', 'L4'].map((no, col) => ({
      operatorOrgId: OP.orgId,
      tripId,
      no,
      deck: 'LOWER',
      type: 'SLEEPER',
      row: 0,
      col,
      ladies: no === 'L4',
    })),
  );
});

/** @param {string[]} seats @param {string} from @param {string} to @param {string[]} [ladiesOk] */
const hold = (seats, from, to, ladiesOk = []) => claims.hold({ tripId, seats, fromStopId: from, toStopId: to, ladiesOk, by: 'buyer:test' });
const seat = async (/** @type {string} */ no) => /** @type {any} */ (await TripSeatRecord.findOne({ tripId, no }).setOptions(S).lean());

/** On every seat: taken = OR of entries, entries never overlap. */
async function invariants() {
  for (const s of await TripSeatRecord.find({ tripId }).setOptions(S).lean()) {
    expect(s.taken, s.no).toBe(maskOf(/** @type {any} */ (s.entries)));
    expect(entriesOverlap(/** @type {any} */ (s.entries)), s.no).toBe(false);
  }
}

describe('seat rules', () => {
  it('part route, ladies seats, all or nothing, stop sale, departed, confirm, release', async () => {
    const ab = await hold(['L1'], A, B);
    expect(ab.status).toBe('ACTIVE');
    expect((await hold(['L1'], B, D)).status).toBe('ACTIVE'); // other legs, same seat
    await expect(hold(['L1'], A, C)).rejects.toMatchObject({ code: 'SEAT_UNAVAILABLE' });
    expect((await seat('L1')).taken).toBe(legMask(0, 3));

    await expect(hold(['L4'], A, D)).rejects.toMatchObject({ code: 'LADIES_SEAT' });
    expect((await hold(['L4'], A, D, ['L4'])).status).toBe('ACTIVE');

    await expect(hold(['L2', 'L1'], A, B)).rejects.toMatchObject({ code: 'SEAT_UNAVAILABLE', details: { seat: 'L1' } });
    expect((await seat('L2')).taken).toBe(0); // given back
    await expect(hold(['L2'], D, A)).rejects.toMatchObject({ code: 'STOPS_WRONG_WAY' });
    await expect(hold(['L2'], D, D)).rejects.toBeTruthy();

    await claims.setSale(OP, tripId, true);
    await expect(hold(['L2'], A, B)).rejects.toMatchObject({ code: 'SALE_STOPPED' });
    const blk = await claims.block(OP, tripId, { seats: ['L2'], note: 'counter' });
    expect(blk).toMatchObject({ kind: 'BLOCK', status: 'ACTIVE', fromIdx: 0, toIdx: 3 });
    await expect(claims.block(OTHER, tripId, { seats: ['L3'] })).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND' });
    expect((await claims.blocksOf(OP.orgId, tripId)).map((b) => b.seats)).toEqual([['L2']]);
    await claims.releaseBlock(OP, blk.id);
    expect((await seat('L2')).taken).toBe(0);
    await expect(claims.releaseBlock(OP, blk.id)).rejects.toMatchObject({ code: 'BLOCK_NOT_FOUND' });
    await claims.setSale(OP, tripId, false);

    now = new Date(Date.parse('2026-12-12T16:45:00Z')); // left A at 16:30, reaches B at 17:30
    await expect(hold(['L3'], A, D)).rejects.toMatchObject({ code: 'TRIP_DEPARTED' });
    const later = await hold(['L3'], B, D);
    await claims.confirm(later.id);
    expect((await seat('L3')).entries).toEqual([expect.objectContaining({ kind: 'BOOKING', ref: later.id })]);
    await expect(claims.confirm(later.id)).rejects.toMatchObject({ code: 'HOLD_NOT_ACTIVE' });
    await claims.releaseHold(later.id); // booking cancelled → seats back
    expect((await seat('L3')).taken).toBe(0);
    await claims.releaseHold(ab.id);
    expect((await seat('L1')).taken).toBe(legMask(1, 3));
    await invariants();
  });

  it('crash mid-way and expired holds are given back by the sweeper', async () => {
    const h = await hold(['L1'], A, D);
    // a claim that took L2 and crashed before finishing (still TAKING, 3 minutes old)
    const stuck = await ClaimRecord.create({
      operatorOrgId: OP.orgId,
      tripId,
      kind: 'HOLD',
      seats: ['L2', 'L3'],
      fromIdx: 0,
      toIdx: 3,
      mask: 7,
      by: 'buyer:x',
    });
    await TripSeatRecord.updateOne(
      { tripId, no: 'L2' },
      { $bit: { taken: { or: 7 } }, $push: { entries: { kind: 'HOLD', ref: String(stuck._id), mask: 7, at: now } } },
    ).setOptions(S);
    await ClaimRecord.collection.updateOne({ _id: stuck._id }, { $set: { createdAt: new Date(Date.now() - 3 * 60_000) } });
    expect(await claims.sweep()).toEqual({ expired: 1, released: 1 });
    expect((await seat('L2')).taken).toBe(0);
    expect((await seat('L1')).taken).toBe(7); // the live hold stays
    now = new Date(now.getTime() + 16 * 60_000);
    expect(await claims.sweep()).toEqual({ expired: 1, released: 1 });
    expect((await seat('L1')).taken).toBe(0);
    await expect(claims.confirm(h.id)).rejects.toMatchObject({ code: 'HOLD_NOT_ACTIVE' });
    expect(await claims.sweep()).toEqual({ expired: 0, released: 0 });
    await invariants();
  });
});

describe('races', () => {
  it('500 buyers at once on overlapping seats and legs', async () => {
    const legs = [
      [A, B],
      [B, C],
      [C, D],
      [A, C],
      [B, D],
      [A, D],
    ];
    const wishes = Array.from({ length: 500 }, (_, i) => ({
      seats: ['L1', 'L2', 'L3'].slice(i % 3, (i % 3) + 1 + (i % 2)),
      leg: /** @type {[string, string]} */ (legs[(i * 7) % legs.length]),
    }));
    const results = await Promise.allSettled(wishes.map((w) => hold(w.seats, w.leg[0], w.leg[1])));
    const won = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    expect(won.length).toBeGreaterThan(0);
    expect(results.filter((r) => r.status === 'rejected').every((r) => /** @type {any} */ (r).reason.code === 'SEAT_UNAVAILABLE')).toBe(
      true,
    );
    await invariants();
    for (const s of await TripSeatRecord.find({ tripId }).setOptions(S).lean()) {
      const refs = s.entries.map((e) => e.ref);
      for (const c of won) expect(refs.includes(c.id), `${c.id} on ${s.no}`).toBe(c.seats.includes(s.no));
    }
    const lost = await ClaimRecord.find({ status: 'FAILED' }).setOptions(S).lean();
    expect(lost.length).toBe(500 - won.length);
  });

  it('100 counter blocks and 100 holds on one seat → exactly one wins', async () => {
    const tries = Array.from({ length: 200 }, (_, i) => (i % 2 ? claims.block(OP, tripId, { seats: ['L2'] }) : hold(['L2'], A, D)));
    const ok = (await Promise.allSettled(tries)).filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);
    expect((await seat('L2')).entries).toHaveLength(1);
    await invariants();
  });
});
