// @ts-check
/**
 * Stage 04 mandatory tests (plan Stage 04 §8, §9). This file holds tenant isolation for every Stage 04 collection
 * (and that every `inv_` collection is classified). The rest of the list lives in:
 * - availability vs a simple reference (400 random calendars + 30 through the database) → inventory-availability.test.js
 * - 100 parallel holds on 3 rooms → exactly 3; multi-night all-or-nothing; release / confirm / return repeat-safe;
 *   lost night; extension once → inventory-holds.test.js
 * - crash after each step (PLACING / RELEASING / CONFIRMING) restored by the reconciler; sweeper returns expired
 *   holds and removes leftovers; invariant checks → inventory-safety-net.test.js
 * - the database rule refuses booked + held > total, negatives, counts not matching owners (raw writes) → inventory-days.test.js
 * - allotment reduction below booked refused with the dates listed → inventory-calendar-edit.test.js,
 *   inventory-calendar-import.test.js, inventory-admin-calendar.test.js
 * - fat-finger protection (preview, > 50 % confirmation, undo, change log) → inventory-calendar-edit.test.js
 * - live signals (event stored with the change → relay → availability:changed) → inventory-signals.test.js
 * - property limits for staff (unassigned property 404, Front Desk 403, other company 404) → inventory-policies,
 *   inventory-rate-plans, inventory-calendar, inventory-calendar-edit, inventory-calendar-import tests
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  HoldRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const A = '64b0000000000000000000aa';
const B = '64b0000000000000000000bb';
const at = new Date('2026-11-17T10:00:00Z');

/** @type {[string, import('mongoose').Model<any>, (o: string) => Record<string, unknown>][]} every Stage 04 collection owned by a hotel */
const OWNED = [
  [
    'inv_cancellation_policies',
    CancellationPolicyRecord,
    (o) => ({
      hotelOrgId: o,
      propertyId: `p-${o}`,
      name: 'Flexible',
      nameKey: 'flexible',
      nonRefundable: false,
      rules: [],
      noShow: { type: 'PERCENT', value: 100 },
      summary: 's',
      createdBy: 'u',
      updatedBy: 'u',
    }),
  ],
  [
    'inv_rate_plans',
    RatePlanRecord,
    (o) => ({
      hotelOrgId: o,
      propertyId: `p-${o}`,
      name: 'EP',
      nameKey: `ep-${o}`,
      roomTypeIds: ['r'],
      mealPlanKey: 'ep',
      cancellationPolicyId: 'c',
      pricingModel: 'PER_ROOM',
      minAdvanceDays: 0,
      maxAdvanceDays: 365,
      createdBy: 'u',
      updatedBy: 'u',
    }),
  ],
  [
    'inv_inventory_days',
    InventoryDayRecord,
    (o) => ({
      hotelOrgId: o,
      propertyId: `p-${o}`,
      roomTypeId: `r-${o}`,
      date: '2026-12-01',
      total: 2,
      booked: 0,
      held: 0,
      holds: [],
      bookings: [],
    }),
  ],
  [
    'inv_rate_days',
    RateDayRecord,
    (o) => ({
      hotelOrgId: o,
      propertyId: `p-${o}`,
      ratePlanId: `rp-${o}`,
      roomTypeId: `r-${o}`,
      date: '2026-12-01',
      prices: [{ guests: 0, amount: 100000 }],
    }),
  ],
  [
    'inv_holds',
    HoldRecord,
    (o) => ({
      orderId: `order-${o}`,
      hotelOrgId: o,
      propertyId: `p-${o}`,
      lines: [{ roomTypeId: 'r', qty: 1, dates: ['2026-12-01'] }],
      status: 'ACTIVE',
      statusChangedAt: at,
      expiresAt: at,
    }),
  ],
  [
    'inv_change_log',
    ChangeLogRecord,
    (o) => ({
      hotelOrgId: o,
      propertyId: `p-${o}`,
      requestId: `req-${o}`,
      kind: 'EDIT',
      status: 'APPLIED',
      by: 'u',
      month: '2026-11',
      from: '2026-12-01',
      to: '2026-12-02',
      request: {},
      before: {},
    }),
  ],
];
/** No Stage 04 collection is platform-wide: everything belongs to a hotel. */
const PLATFORM_WIDE = /** @type {string[]} */ ([]);

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  for (const [, model, doc] of OWNED) await model.insertMany([doc(A), doc(B)]);
});
afterAll(async () => mongo.stop());

describe('tenant isolation — every Stage 04 collection', () => {
  it.each(OWNED)('%s: unscoped reads and writes are refused', async (_name, model) => {
    await expect(model.find({}).lean()).rejects.toThrow(/no ownership filter/);
    await expect(model.countDocuments({})).rejects.toThrow(/no ownership filter/);
    await expect(model.updateMany({}, { $set: { updatedAt: new Date() } })).rejects.toThrow(/no ownership filter/);
    await expect(model.deleteMany({})).rejects.toThrow(/no ownership filter/);
    await expect(model.aggregate([{ $match: {} }])).rejects.toThrow(/no ownership filter/);
  });

  it.each(OWNED)("%s: a scoped query sees only that hotel's documents", async (_name, model) => {
    const docs = await model.find({ hotelOrgId: A }).lean();
    expect(docs.length).toBe(1);
    expect(String(/** @type {any} */ (docs[0]).hotelOrgId)).toBe(A);
  });

  it('every inv_ collection is classified (owned by a hotel, or platform-wide on purpose)', () => {
    const classified = new Set([...OWNED.map(([name]) => name), ...PLATFORM_WIDE]);
    const stage04 = Object.values(b2bMongoose.models)
      .map((m) => m.collection.collectionName)
      .filter((n) => n.startsWith('inv_'));
    expect(stage04.filter((n) => !classified.has(n))).toEqual([]);
    expect([...new Set(stage04)].sort()).toEqual(OWNED.map(([n]) => n).sort());
  });
});
