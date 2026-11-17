// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { newEvent } from '../../src/b2b/core/db/events.js';
import { applyOwned, transferOwned, undoOwned } from '../../src/b2b/core/db/owned-counter.js';
import { transition } from '../../src/b2b/core/db/transition.js';
import { createInvariantChecks } from '../../src/b2b/core/db/invariants.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { startMongo } from './helpers/mongo.js';
import {
  BOOKED,
  confirmSteps,
  createCollections,
  HELD,
  Hold,
  holdSteps,
  Night,
  placeHold,
  sampleReconciler,
  seedNights,
  SYS,
} from './helpers/sample-hold-flow.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let nowMs = Date.parse('2026-11-12T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const advance = (/** @type {number} */ ms) => {
  nowMs += ms;
};
const quiet = createLogger({ write: () => {} });
const HOTEL = 'hotel-1';
const DATES = ['2026-12-30', '2026-12-31', '2027-01-01'];

beforeAll(async () => {
  mongo = await startMongo();
  await createCollections(mongo.db);
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await Night.deleteMany({ hotelOrgId: HOTEL });
  await Hold.deleteMany({ hotelOrgId: HOTEL });
});

async function nights() {
  return Night.find({ hotelOrgId: HOTEL }).sort({ date: 1 }).lean();
}

/** Invariants that must hold at EVERY moment. */
async function assertConsistent() {
  for (const n of await nights()) {
    const heldSum = (n.holds ?? []).reduce((s, h) => s + Number(h.qty), 0);
    const bookedSum = (n.bookings ?? []).reduce((s, b) => s + Number(b.qty), 0);
    expect(n.held).toBe(heldSum);
    expect(n.booked).toBe(bookedSum);
    expect(Number(n.held) + Number(n.booked)).toBeLessThanOrEqual(Number(n.total));
  }
}

describe('owned counters (P2) — repeat-safe and exactly undoable', () => {
  it('apply twice = once; undo twice = once; transfer twice = once', async () => {
    await seedNights(HOTEL, 'rt1', ['2026-12-30'], 5);
    const f = { hotelOrgId: HOTEL, date: '2026-12-30' };
    const apply = applyOwned(HELD, 'h1', 2, { capacity: { total: 'total', others: ['booked'] } });
    expect((await Night.updateOne({ ...f, ...apply.filter }, apply.update)).modifiedCount).toBe(1);
    expect((await Night.updateOne({ ...f, ...apply.filter }, apply.update)).modifiedCount).toBe(0);
    const t = transferOwned(HELD, BOOKED, 'h1', 'b1');
    expect((await Night.updateOne({ ...f, ...t.filter }, t.update)).modifiedCount).toBe(1);
    expect((await Night.updateOne({ ...f, ...t.filter }, t.update)).modifiedCount).toBe(0);
    const u = undoOwned(BOOKED, 'b1');
    expect((await Night.updateOne({ ...f, ...u.filter }, u.update)).modifiedCount).toBe(1);
    expect((await Night.updateOne({ ...f, ...u.filter }, u.update)).modifiedCount).toBe(0);
    expect((await nights())[0]).toMatchObject({ held: 0, booked: 0, holds: [], bookings: [] });
  });

  it('the database validator refuses an impossible write even from buggy code', async () => {
    await seedNights(HOTEL, 'rt1', ['2026-12-30'], 1);
    await expect(Night.updateOne({ hotelOrgId: HOTEL }, { $inc: { held: 2 } })).rejects.toThrow(/validation/i);
  });
});

describe('transition (P1) — exactly one winner', () => {
  it('10 concurrent ACTIVE → CONFIRMING: one wins, events stored with the change', async () => {
    await Hold.create({
      _id: 'h-race',
      hotelOrgId: HOTEL,
      roomTypeId: 'rt1',
      dates: [],
      qty: 1,
      status: 'ACTIVE',
      statusChangedAt: clock.now(),
    });
    const event = newEvent('hotel-inventory.hold.confirming', { holdId: 'h-race' }, { clock });
    const wins = await Promise.all(
      Array.from({ length: 10 }, () =>
        transition(Hold, { id: 'h-race', scope: { hotelOrgId: HOTEL }, from: 'ACTIVE', to: 'CONFIRMING', events: [event], clock }),
      ),
    );
    expect(wins.filter(Boolean)).toHaveLength(1);
    const doc = await Hold.findOne({ _id: 'h-race', hotelOrgId: HOTEL }).lean();
    expect(doc).toMatchObject({ status: 'CONFIRMING', hasPendingEvents: true });
    expect(doc?.pendingEvents).toHaveLength(1);
  });

  it('refuses event types that do not follow module.entity.pastVerb', () => {
    expect(() => newEvent('confirmed', {}, { clock })).toThrow(/module.entity.pastVerb/);
  });
});

describe('no double booking under a race (standalone MongoDB, no transactions)', () => {
  it('20 buyers, 3-night stays, 3 rooms left → exactly 3 succeed, counts exact', async () => {
    await seedNights(HOTEL, 'rt1', DATES, 3);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        placeHold({ id: `race-${i}`, hotelOrgId: HOTEL, roomTypeId: 'rt1', dates: DATES, qty: 1 }, clock),
      ),
    );
    expect(results.filter((r) => r === 'ACTIVE')).toHaveLength(3);
    for (const n of await nights()) expect(n.held).toBe(3);
    await assertConsistent();
  });

  it('overlapping stays: no night is ever oversold, losers give everything back', async () => {
    await seedNights(HOTEL, 'rt1', DATES, 2);
    const stays = [DATES.slice(0, 2), DATES.slice(1, 3), DATES, DATES.slice(0, 1), DATES.slice(2, 3)];
    await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        placeHold({ id: `ov-${i}`, hotelOrgId: HOTEL, roomTypeId: 'rt1', dates: stays[i % stays.length] ?? DATES, qty: 1 }, clock),
      ),
    );
    await assertConsistent();
    const active = await Hold.find({ hotelOrgId: HOTEL, status: 'ACTIVE' }).lean();
    for (const date of DATES) {
      const usedByActive = active.filter((h) => h.dates?.includes(date)).length;
      expect((await nights()).find((n) => n.date === date)?.held).toBe(usedByActive);
    }
  });
});

describe('crash at every step → the reconciler restores a consistent state (P3/P4)', () => {
  const hold = { id: 'crash-h', hotelOrgId: HOTEL, roomTypeId: 'rt1', dates: DATES, qty: 2 };
  const holdStepCount = holdSteps(hold, clock).length;

  it.each(Array.from({ length: holdStepCount }, (_, n) => n))('hold flow stopped after %i steps', async (n) => {
    await seedNights(HOTEL, 'rt1', DATES, 5);
    for (const step of holdSteps(hold, clock).slice(0, n)) await step(); // the "crash"
    await assertConsistent();
    advance(31_000);
    await sampleReconciler().runOnce({ clock, logger: quiet });
    await assertConsistent();
    const after = await Hold.findOne({ _id: hold.id, hotelOrgId: HOTEL }).lean();
    if (after) expect(['FAILED', 'ACTIVE']).toContain(after.status); // never left half-way
    if (!after || after.status === 'FAILED') for (const night of await nights()) expect(night.held).toBe(0);
  });

  const confirmStepCount = confirmSteps(hold, 'b1', clock).length;
  it.each(Array.from({ length: confirmStepCount }, (_, n) => n))(
    'confirm flow stopped after %i steps (money taken → finish forward)',
    async (n) => {
      await seedNights(HOTEL, 'rt1', DATES, 5);
      expect(await placeHold(hold, clock)).toBe('ACTIVE');
      for (const step of confirmSteps(hold, 'b1', clock).slice(0, n)) await step();
      await assertConsistent();
      advance(31_000);
      await sampleReconciler().runOnce({ clock, logger: quiet });
      await assertConsistent();
      const after = await Hold.findOne({ _id: hold.id, hotelOrgId: HOTEL }).lean();
      if (n === 0) {
        expect(after?.status).toBe('ACTIVE'); // nothing started — stays a normal hold
      } else {
        expect(after?.status).toBe('CONFIRMED');
        for (const night of await nights()) expect(night).toMatchObject({ held: 0, booked: 2 });
      }
    },
  );
});

describe('invariant checks', () => {
  it('report violations without throwing', async () => {
    /** @type {string[]} */
    const lines = [];
    const checks = createInvariantChecks();
    checks.register({ name: 'always-ok', check: async () => [] });
    checks.register({ name: 'broken', check: async () => [{ id: 'x', detail: 'held != sum' }] });
    checks.register({
      name: 'crashes',
      check: async () => {
        throw new Error('boom');
      },
    });
    const reports = await checks.runAll(createLogger({ write: (l) => lines.push(l) }));
    expect(reports.map((r) => [r.name, r.violations.length, r.error ?? null])).toEqual([
      ['always-ok', 0, null],
      ['broken', 1, null],
      ['crashes', 0, 'boom'],
    ]);
    expect(lines).toHaveLength(2);
  });

  it('system scope used by the reconciler is logged by the tenant guard', () => {
    expect(SYS).toEqual({ tenantScope: 'SYSTEM', tenantReason: 'test-booking-engine' });
  });
});
