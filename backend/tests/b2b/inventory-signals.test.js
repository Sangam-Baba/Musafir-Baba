// @ts-check
/**
 * Availability signals (S04-T10; plan §3.11, `05-…` §7a, §8): a hold placed / released (and a calendar edit —
 * checked in inventory-calendar-edit.test.js) store `inventory.changed` in the same update; the relay + consumer turn it into `availability:changed` for
 * `availability:property:{id}` (and a cache eviction); bursts become one signal per property per second.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { eventBus } from '../../src/b2b/background.js';
import { systemContext } from '../../src/b2b/core/context.js';
import { consumerJobHandlers, relayOnce } from '../../src/b2b/core/db/events-relay.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createJobRunner } from '../../src/b2b/core/jobs/runner.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { SIGNALS_COLLECTION } from '../../src/b2b/core/realtime/signals.js';
import {
  createAvailabilitySignals,
  createHoldService,
  ensureNights,
  HoldRecord,
  InventoryDayRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-11-17T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '64b0000000000000000000aa';
const quiet = createLogger({ write: () => {} });
const PROPERTY = '64b0000000000000000000cc';

describe('one signal per property per second', () => {
  it('the first goes out at once; the rest of that second are merged into one; other properties are separate', async () => {
    /** @type {any[]} */
    const sent = [];
    const signals = createAvailabilitySignals({ clock, logger: quiet, everyMs: 60_000, send: async (c) => void sent.push(c) });
    const ev = (/** @type {string} */ p, /** @type {string[]} */ rt, /** @type {string} */ from, /** @type {string} */ to) => ({
      payload: { propertyId: p, roomTypeIds: rt, dateFrom: from, dateTo: to },
    });
    await signals.handle(ev('p1', ['r1'], '2026-12-01', '2026-12-03'));
    await signals.handle(ev('p1', ['r2'], '2026-12-05', '2026-12-06'));
    await signals.handle(ev('p1', ['r1'], '2026-11-30', '2026-12-02'));
    await signals.handle(ev('p2', ['r9'], '2026-12-01', '2026-12-02'));
    expect(sent.map((c) => c.propertyId)).toEqual(['p1', 'p2']);
    await signals.flushAll();
    expect(sent[2]).toEqual({ propertyId: 'p1', roomTypeIds: ['r1', 'r2'], dateFrom: '2026-11-30', dateTo: '2026-12-06' });
  });
});

describe('from the change to the live signal', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());
  beforeEach(async () => {
    await Promise.all([
      InventoryDayRecord.deleteMany({}).setOptions(SYSTEM),
      HoldRecord.deleteMany({}).setOptions(SYSTEM),
      JobRecord.deleteMany({}),
    ]);
    await ensureNights({ hotelOrgId: ORG, propertyId: PROPERTY, roomTypeIds: ['r1'], dates: ['2026-12-01', '2026-12-02'] });
    await InventoryDayRecord.updateMany({ hotelOrgId: ORG }, { $set: { total: 3 } });
  });

  async function runBackground() {
    await relayOnce(HoldRecord, eventBus, clock);
    const runner = createJobRunner({ handlers: consumerJobHandlers(eventBus, clock), workerId: 'test', clock, logger: quiet });
    while (await runner.processOne()) {
      /* drain */
    }
  }
  const signalsFor = () =>
    mongo.db
      .collection(SIGNALS_COLLECTION)
      .find({ room: `availability:property:${PROPERTY}` })
      .sort({ _id: 1 })
      .toArray();

  it('a hold placed then released: each stores inventory.changed with the hold, and open pages get availability:changed', async () => {
    const holds = createHoldService({ clock });
    const sys = systemContext('booking engine (test)', 'req', quiet, clock);
    const h = await holds.holdRooms(sys, {
      orderId: 'o-1',
      hotelOrgId: ORG,
      propertyId: PROPERTY,
      lines: [{ roomTypeId: 'r1', qty: 1, dates: ['2026-12-01', '2026-12-02'] }],
    });
    const stored = /** @type {any} */ (await HoldRecord.findById(h.id).setOptions(SYSTEM).lean());
    expect(stored.pendingEvents.map((/** @type {any} */ e) => [e.type, e.payload])).toEqual([
      [
        'hotel-inventory.inventory.changed',
        { orgId: ORG, propertyId: PROPERTY, roomTypeIds: ['r1'], dateFrom: '2026-12-01', dateTo: '2026-12-03' },
      ],
    ]);
    await runBackground();
    const first = await signalsFor();
    expect(first.map((s) => [s.event, s.data])).toEqual([
      ['availability:changed', { propertyId: PROPERTY, roomTypeIds: ['r1'], dateFrom: '2026-12-01', dateTo: '2026-12-03' }],
    ]);
    expect(
      await mongo.db
        .collection(SIGNALS_COLLECTION)
        .countDocuments({ room: 'cache:evict', 'data.prefix': `availability:property:${PROPERTY}` }),
    ).toBe(1);

    now = new Date(now.getTime() + 5000); // a later second
    await holds.releaseHold(sys, h.id);
    await runBackground();
    // the live process limits signals to one per property per (real) second: the release arrives as the trailing one
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(await signalsFor()).toHaveLength(2);
  });
});
