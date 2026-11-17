// @ts-check
/**
 * The rooms safety net (S04-T09; `05-…` §5.4, §12 crash injection): a process killed after each step of hold,
 * release and confirm leaves a state the reconciler restores within a run; expired holds and left-over entries
 * are swept; invariant checks find nothing on a healthy calendar and report real damage.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { systemContext } from '../../src/b2b/core/context.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createReconciler } from '../../src/b2b/core/jobs/reconciler.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import {
  createHoldService,
  ensureNights,
  HoldRecord,
  INVENTORY_DAYS_COLLECTION,
  InventoryDayRecord,
  holdReconcileRules,
  inventoryInvariants,
  sweepHolds,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-11-17T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '64b0000000000000000000aa';
/** @type {{ level: string, msg: string }[]} */
let logged = [];
const logger = createLogger({ write: (line) => logged.push(JSON.parse(line)) });
const sys = systemContext('booking engine (test)', 'req', logger, clock);
const holds = createHoldService({ clock });
const reconciler = createReconciler();
for (const rule of holdReconcileRules({ clock, logger })) reconciler.register(rule);
const later = (/** @type {number} */ ms) => (now = new Date(now.getTime() + ms));

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  now = new Date('2026-11-17T10:00:00Z');
  logged = [];
  await Promise.all([InventoryDayRecord.deleteMany({}).setOptions(SYSTEM), HoldRecord.deleteMany({}).setOptions(SYSTEM)]);
  await ensureNights({ hotelOrgId: ORG, propertyId: 'p1', roomTypeIds: ['r1'], dates: ['2026-12-01', '2026-12-02'] });
  await InventoryDayRecord.updateMany({ hotelOrgId: ORG }, { $set: { total: 2 } });
});
afterEach(async () => {
  const [bad] = await Promise.all(inventoryInvariants({ clock }).map((i) => i.check()));
  expect(bad).toEqual([]);
});

const DATES = ['2026-12-01', '2026-12-02'];
/** @param {string} date */
const night = async (date) => /** @type {any} */ (await InventoryDayRecord.findOne({ hotelOrgId: ORG, roomTypeId: 'r1', date }).lean());
/** @param {string} id */
const status = async (id) => (await HoldRecord.findById(id).setOptions(SYSTEM).lean())?.status;
/** A hold the way a process leaves it after taking only night 1 (then dying). @param {string} st */
async function halfHeld(st) {
  const h = await HoldRecord.create({
    orderId: `o-${st}`,
    hotelOrgId: ORG,
    propertyId: 'p1',
    lines: [{ roomTypeId: 'r1', qty: 1, dates: DATES }],
    status: st,
    statusChangedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60_000),
  });
  await InventoryDayRecord.updateOne(
    { hotelOrgId: ORG, roomTypeId: 'r1', date: DATES[0] },
    { $inc: { held: 1 }, $push: { holds: { holdId: String(h._id), qty: 1, expiresAt: h.expiresAt } } },
  );
  return String(h._id);
}

describe('crash after each step → the reconciler restores a consistent state', () => {
  it('killed while taking nights (PLACING): after 30 s night 1 is given back and the hold fails', async () => {
    const id = await halfHeld('PLACING');
    await reconciler.runOnce({ clock, logger });
    expect((await night(DATES[0] ?? '')).held).toBe(1); // not yet: it might still be running
    later(31_000);
    await reconciler.runOnce({ clock, logger });
    expect([(await night(DATES[0] ?? '')).held, await status(id)]).toEqual([0, 'FAILED']);
  });

  it('killed while releasing (RELEASING): the release is finished', async () => {
    const id = await halfHeld('RELEASING');
    later(31_000);
    await reconciler.runOnce({ clock, logger });
    expect([(await night(DATES[0] ?? '')).held, await status(id)]).toEqual([0, 'RELEASED']);
  });

  it('killed while confirming (CONFIRMING, money may be captured): the confirm is finished forward', async () => {
    const h = await holds.holdRooms(sys, {
      orderId: 'o-1',
      hotelOrgId: ORG,
      propertyId: 'p1',
      lines: [{ roomTypeId: 'r1', qty: 1, dates: DATES }],
    });
    await HoldRecord.updateOne({ _id: h.id }, { $set: { status: 'CONFIRMING', bookingId: 'b-1', statusChangedAt: now } }).setOptions(
      SYSTEM,
    );
    later(31_000);
    await reconciler.runOnce({ clock, logger });
    expect(await status(h.id)).toBe('CONFIRMED');
    for (const d of DATES) expect(await night(d)).toMatchObject({ held: 0, booked: 1, bookings: [{ bookingId: 'b-1', qty: 1 }] });
  });
});

describe('the hold sweeper', () => {
  it('releases expired holds (rooms back), leaves an extended one alone', async () => {
    const a = await holds.holdRooms(sys, {
      orderId: 'o-a',
      hotelOrgId: ORG,
      propertyId: 'p1',
      lines: [{ roomTypeId: 'r1', qty: 1, dates: DATES }],
    });
    const b = await holds.holdRooms(sys, {
      orderId: 'o-b',
      hotelOrgId: ORG,
      propertyId: 'p1',
      lines: [{ roomTypeId: 'r1', qty: 1, dates: DATES }],
    });
    later(14 * 60_000);
    await holds.extendHold(sys, b.id);
    later(2 * 60_000); // a expired 1 minute ago; b runs until +25
    expect(await sweepHolds({ clock, logger })).toEqual({ expired: 1, orphans: 0, overdue: 0 });
    expect([await status(a.id), await status(b.id), (await night(DATES[1] ?? '')).held]).toEqual(['RELEASED', 'ACTIVE', 1]);
  });

  it('removes entries left behind by ended holds (> 5 min), keeps those of a hold being confirmed', async () => {
    const gone = await halfHeld('RELEASED');
    const confirming = await halfHeld('CONFIRMING');
    later(21 * 60_000);
    const report = await sweepHolds({ clock, logger });
    expect(report.orphans).toBe(1);
    const holdsLeft = (await night(DATES[0] ?? '')).holds.map((/** @type {any} */ e) => e.holdId);
    expect(holdsLeft).toEqual([confirming]);
    expect(holdsLeft).not.toContain(gone);
    expect(logged.some((l) => l.msg === 'inventory: removed hold entries left behind')).toBe(true);
    // the confirming one is finished by the reconciler (night 2 had no entry: taken again because a room is free)
    await reconciler.runOnce({ clock, logger });
    expect(await status(confirming)).toBe('CONFIRMED');
  });
});

describe('invariant checks', () => {
  it('report damage written around the database rule (e.g. a restore from an old backup)', async () => {
    await mongo.db.collection(INVENTORY_DAYS_COLLECTION).insertOne(
      {
        hotelOrgId: ORG,
        propertyId: 'p1',
        roomTypeId: 'r9',
        date: '2026-12-05',
        total: 1,
        booked: 2,
        held: 0,
        stopSell: false,
        holds: [],
        bookings: [{ bookingId: 'x', qty: 1 }],
      },
      { bypassDocumentValidation: true },
    );
    await InventoryDayRecord.updateOne(
      { hotelOrgId: ORG, date: DATES[1] },
      { $inc: { held: 1 }, $push: { holds: { holdId: '64b0000000000000000000ff', qty: 1, expiresAt: new Date('2026-11-17T09:00:00Z') } } },
    );
    const [counts, entries] = await Promise.all(inventoryInvariants({ clock }).map((i) => i.check()));
    expect(counts?.map((v) => v.detail)).toEqual(['r9 2026-12-05: total 1, booked 2, held 0']);
    expect(entries?.map((v) => v.id)).toEqual(['64b0000000000000000000ff']);
    await mongo.db.collection(INVENTORY_DAYS_COLLECTION).deleteOne({ roomTypeId: 'r9' });
    await InventoryDayRecord.updateOne({ hotelOrgId: ORG, date: DATES[1] }, { $set: { held: 0, holds: [] } });
  });
});
