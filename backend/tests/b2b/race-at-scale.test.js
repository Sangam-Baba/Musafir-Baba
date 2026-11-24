// @ts-check
/**
 * Last-room race at scale (S16-T04, plan Stage 16 §2.2): 500 buyers at the same moment for 5 rooms over 3 nights,
 * wanting 1–3 nights and 1–2 rooms each, overlapping in every way → on every night booked + held ≤ total and
 * held = Σ its holds; every winner holds all its nights, every loser none (all-or-nothing); some buyers win. Then
 * 200 more at once while winners confirm and some release → still never more than the rooms.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { systemContext } from '../../src/b2b/core/context.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createHoldService, ensureNights, HoldRecord, InventoryDayRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-24T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '64b0000000000000000016aa';
const P = { hotelOrgId: ORG, propertyId: 'p-race' };
const NIGHTS = /** @type {const} */ (['2027-01-10', '2027-01-11', '2027-01-12']);
const ROOMS = 5;
const sys = systemContext('race at scale (test)', 'req-race', createLogger({ write: () => {} }));
const holds = createHoldService({ clock });
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await ensureNights({ ...P, roomTypeIds: ['r1'], dates: [...NIGHTS] });
  for (const date of NIGHTS) await InventoryDayRecord.updateOne({ hotelOrgId: ORG, roomTypeId: 'r1', date }, { $set: { total: ROOMS } });
});
afterAll(async () => mongo.stop());

/** Buyer i's wish (fixed pattern, so a failure can be replayed). @param {number} i */
const wish = (i) => {
  const from = i % 3;
  const len = 1 + ((i * 7) % (3 - from));
  return { dates: NIGHTS.slice(from, from + len), qty: 1 + ((i * 13) % 2) };
};

async function assertNeverOversold() {
  const nights = await InventoryDayRecord.find({ hotelOrgId: ORG }).lean();
  for (const n of nights) {
    expect(n.held, n.date).toBe(n.holds.reduce((s, h) => s + h.qty, 0));
    expect(n.booked, n.date).toBe(n.bookings.reduce((s, b) => s + b.qty, 0));
    expect(n.booked + n.held, n.date).toBeLessThanOrEqual(n.total);
  }
  return nights;
}

describe('the last rooms at scale', () => {
  it('500 buyers at once → never more than the rooms, all-or-nothing per buyer', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 500 }, (_, i) => {
        const w = wish(i);
        return holds.holdRooms(sys, { ...P, orderId: `race-${i}`, lines: [{ roomTypeId: 'r1', qty: w.qty, dates: w.dates }] });
      }),
    );
    const won = results.flatMap((r, i) => (r.status === 'fulfilled' ? [i] : []));
    const lost = results.filter((r) => r.status === 'rejected');
    expect(won.length).toBeGreaterThan(0);
    expect(lost.every((r) => /** @type {any} */ (r).reason.code === 'SOLD_OUT')).toBe(true);
    const nights = await assertNeverOversold();
    for (const date of NIGHTS) {
      const wanted = won.filter((i) => wish(i).dates.includes(date)).reduce((s, i) => s + wish(i).qty, 0);
      expect(nights.find((n) => n.date === date)?.held, date).toBe(wanted); // what winners hold = what the nights say
    }
    const failed = await HoldRecord.find({ status: 'FAILED' }).setOptions(SYSTEM).lean();
    const failedIds = new Set(failed.map((h) => String(h._id)));
    for (const n of nights) expect(n.holds.some((h) => failedIds.has(String(h.holdId)))).toBe(false); // losers keep nothing
  }, 120_000);

  it('200 more at once while winners confirm and some give rooms back → still never oversold', async () => {
    const active = await HoldRecord.find({ status: 'ACTIVE' }).setOptions(SYSTEM).lean();
    const half = Math.ceil(active.length / 2);
    const moves = [
      ...active.slice(0, half).map((h) => holds.confirmHold(sys, { holdId: String(h._id), bookingId: `bk-${h.orderId}` })),
      ...active.slice(half).map((h) => holds.releaseHold(sys, String(h._id))),
      ...Array.from({ length: 200 }, (_, i) => {
        const w = wish(i + 500);
        return holds.holdRooms(sys, { ...P, orderId: `race2-${i}`, lines: [{ roomTypeId: 'r1', qty: w.qty, dates: w.dates }] });
      }),
    ];
    await Promise.allSettled(moves);
    await assertNeverOversold();
  }, 120_000);
});
