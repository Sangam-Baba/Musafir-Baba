// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { newEvent } from '../../src/b2b/core/db/events.js';
import { consumerJobHandlers, createEventBus, InboxRecord, OutboxEvent, relayOnce } from '../../src/b2b/core/db/events-relay.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { transition } from '../../src/b2b/core/db/transition.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createJobRunner } from '../../src/b2b/core/jobs/runner.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';
import { createCollections, Hold } from './helpers/sample-hold-flow.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const clock = { now: () => new Date('2026-11-12T10:00:00Z') };
const quiet = createLogger({ write: () => {} });
const HOTEL = 'hotel-1';

/** @type {{ consumer: string, type: string, holdId: unknown }[]} */
let received = [];
function makeBus() {
  const bus = createEventBus();
  bus.subscribe({ consumer: 'notifications', types: ['hotel-inventory.hold.activated'], handler: async (e) => { received.push({ consumer: 'notifications', type: e.type, holdId: e.payload.holdId }); } });
  bus.subscribe({ consumer: 'analytics', types: ['hotel-inventory.hold.activated', 'hotel-inventory.hold.failed'], handler: async (e) => { received.push({ consumer: 'analytics', type: e.type, holdId: e.payload.holdId }); } });
  return bus;
}

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await createCollections(mongo.db);
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  received = [];
  await Promise.all([Hold.deleteMany({ hotelOrgId: HOTEL }), OutboxEvent.deleteMany({}), InboxRecord.deleteMany({}), JobRecord.deleteMany({})]);
});

/** @param {string} id */
async function activateWithEvent(id) {
  await Hold.create({ _id: id, hotelOrgId: HOTEL, roomTypeId: 'rt', dates: [], qty: 1, status: 'PLACING', statusChangedAt: clock.now() });
  const event = newEvent('hotel-inventory.hold.activated', { holdId: id }, { clock });
  expect(await transition(Hold, { id, scope: { hotelOrgId: HOTEL }, from: 'PLACING', to: 'ACTIVE', events: [event], clock })).toBe(true);
  return event;
}

describe('relay', () => {
  it('moves the event to the outbox, queues one job per subscriber, clears the document', async () => {
    const event = await activateWithEvent('h1');
    expect(await relayOnce(Hold, makeBus(), clock)).toBe(1);
    expect(await OutboxEvent.findById(event.eventId).lean()).toMatchObject({ type: 'hotel-inventory.hold.activated', sourceCollection: 'inv_probe_holds', sourceId: 'h1' });
    expect((await JobRecord.find({}).lean()).map((j) => j.name).sort()).toEqual(['event:analytics', 'event:notifications']);
    const doc = await Hold.findOne({ _id: 'h1', hotelOrgId: HOTEL }).lean();
    expect(doc?.hasPendingEvents).toBeUndefined();
    expect(doc?.pendingEvents).toBeUndefined();
  });

  it('repeating the relay (or a crash before clearing) never duplicates anything', async () => {
    const event = await activateWithEvent('h2');
    const bus = makeBus();
    // simulate a crash after publishing but before clearing: publish manually, leave the document as is
    await relayOnce(Hold, bus, clock);
    await Hold.updateOne({ _id: 'h2', hotelOrgId: HOTEL }, { $set: { hasPendingEvents: true, pendingEvents: [event] } });
    await relayOnce(Hold, bus, clock);
    expect(await OutboxEvent.countDocuments({})).toBe(1);
    expect(await JobRecord.countDocuments({})).toBe(2);
  });

  it('two relays running at the same time publish each event once', async () => {
    for (let i = 0; i < 10; i += 1) await activateWithEvent(`p${i}`);
    const bus = makeBus();
    await Promise.all([relayOnce(Hold, bus, clock), relayOnce(Hold, bus, clock), relayOnce(Hold, bus, clock)]);
    expect(await OutboxEvent.countDocuments({})).toBe(10);
    expect(await JobRecord.countDocuments({})).toBe(20);
  });

  it('a new event arriving during relay is not lost', async () => {
    await activateWithEvent('h3');
    const bus = makeBus();
    await relayOnce(Hold, bus, clock);
    const late = newEvent('hotel-inventory.hold.failed', { holdId: 'h3' }, { clock });
    await Hold.updateOne({ _id: 'h3', hotelOrgId: HOTEL }, { $push: { pendingEvents: late }, $set: { hasPendingEvents: true } });
    expect(await relayOnce(Hold, bus, clock)).toBe(1);
    expect(await OutboxEvent.findById(late.eventId).lean()).toBeTruthy();
  });
});

describe('consumers', () => {
  it('end to end: state change → relay → jobs → each handler runs exactly once', async () => {
    await activateWithEvent('h4');
    const bus = makeBus();
    await relayOnce(Hold, bus, clock);
    const runner = createJobRunner({ handlers: consumerJobHandlers(bus, clock), workerId: 'w', clock, logger: quiet });
    while (await runner.processOne()) { /* drain */ }
    expect(received.sort((a, b) => a.consumer.localeCompare(b.consumer))).toEqual([
      { consumer: 'analytics', type: 'hotel-inventory.hold.activated', holdId: 'h4' },
      { consumer: 'notifications', type: 'hotel-inventory.hold.activated', holdId: 'h4' },
    ]);
    expect(await InboxRecord.countDocuments({})).toBe(2);
  });

  it('a delivered event is not handled again even if its job runs twice', async () => {
    const event = await activateWithEvent('h5');
    const bus = makeBus();
    await relayOnce(Hold, bus, clock);
    const handle = /** @type {import('../../src/b2b/core/jobs/runner.js').JobHandler} */ (consumerJobHandlers(bus, clock).get('event:notifications'));
    await handle({ eventId: event.eventId }, /** @type {any} */ ({}));
    await handle({ eventId: event.eventId }, /** @type {any} */ ({}));
    expect(received.filter((r) => r.consumer === 'notifications')).toHaveLength(1);
  });

  it('refuses bad consumer names and double subscriptions', () => {
    const bus = createEventBus();
    expect(() => bus.subscribe({ consumer: 'Bad Name', types: [], handler: async () => {} })).toThrow(/kebab-case/);
    bus.subscribe({ consumer: 'x', types: [], handler: async () => {} });
    expect(() => bus.subscribe({ consumer: 'x', types: [], handler: async () => {} })).toThrow(/twice/);
  });
});
