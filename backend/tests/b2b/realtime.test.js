// @ts-check
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { jobHandlers, routeSignal, startBackground } from '../../src/b2b/background.js';
import { createCache } from '../../src/b2b/core/cache.js';
import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { enqueue, JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { isValidRoom, roomsForActor } from '../../src/b2b/core/realtime/rooms.js';
import { createSignalReader, publish, publishCacheEvict, readSignalsSince } from '../../src/b2b/core/realtime/signals.js';
import { createStreamHub } from '../../src/b2b/core/realtime/stream.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startMongo } from './helpers/mongo.js';
import { openStream } from './helpers/sse.js';

const clock = { now: () => new Date() };
const quiet = createLogger({ write: () => {} });
const AVAIL = 'availability:property:MBHT-ABC123';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {ReturnType<typeof createStreamHub>} */
let hub;
/** @type {ReturnType<typeof createSignalReader>} */
let reader;

/** @param {Partial<Parameters<typeof createStreamHub>[0]>} [overrides] */
const newHub = (overrides = {}) =>
  createStreamHub({
    clock,
    logger: quiet,
    readSince: readSignalsSince,
    objectIdFrom: (hex) => new b2bMongoose.Types.ObjectId(hex),
    ...overrides,
  });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  hub = newHub();
  reader = createSignalReader({ onSignal: (s) => routeSignal(s, hub), clock, logger: quiet, retryMs: 50 });
  reader.start();
});
afterAll(async () => {
  await reader.stop();
  hub.close();
  await mongo.stop();
});

/**
 * Starts the real /api/v1 router (no DB connect from the router; the test owns the connection).
 * @param {{ actor?: any, hub?: ReturnType<typeof createStreamHub> }} [opts]
 */
async function serve(opts = {}) {
  const app = express();
  app.set('trust proxy', false);
  app.use(
    '/api/v1',
    createB2BRouter({ connect: false, logger: quiet, hub: opts.hub ?? hub, authenticate: async () => opts.actor ?? null }),
  );
  /** @type {import('node:http').Server} */
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
  return {
    base,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve(undefined));
      }),
  };
}

describe('live updates over Server-Sent Events (same backend, same address)', () => {
  it('a signed-in member gets their org room; another org gets nothing', async () => {
    const a = await serve({ actor: { type: 'member', userId: 'u1', orgId: 'org1', permissions: [] } });
    const b = await serve({ actor: { type: 'member', userId: 'u2', orgId: 'org2', permissions: [] } });
    const sa = await openStream(`${a.base}/api/v1/realtime/stream`);
    const sb = await openStream(`${b.base}/api/v1/realtime/stream`);
    try {
      expect(sa.status).toBe(200);
      expect(sa.headers.get('content-type')).toMatch(/^text\/event-stream/);
      expect(sa.headers.get('cache-control')).toContain('no-transform');
      expect((await sa.next('ready')).data.rooms).toEqual(['b2b:user:u1', 'b2b:org:org1']);
      await sb.next('ready');
      const got = sa.next('notification:new');
      await publish('b2b:org:org1', 'notification:new', { inboxId: 'n1' }, { clock });
      const ev = await got;
      expect(ev.data).toEqual({ room: 'b2b:org:org1', data: { inboxId: 'n1' } });
      expect(ev.id).toMatch(/^[0-9a-f]{24}$/);
      await new Promise((r) => setTimeout(r, 300));
      expect(sb.events.filter((e) => e.event === 'notification:new')).toEqual([]);
    } finally {
      sa.close();
      sb.close();
      await a.close();
      await b.close();
    }
  });

  it('anonymous visitors may follow availability rooms only', async () => {
    const srv = await serve();
    try {
      const s = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`);
      await s.next('ready');
      const got = s.next('availability:changed');
      await publish(AVAIL, 'availability:changed', { dates: ['2026-12-31'] }, { clock });
      expect((await got).data).toEqual({ room: AVAIL, data: { dates: ['2026-12-31'] } });
      s.close();

      const personal = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=b2b:org:org1`);
      expect(personal.status).toBe(400);
      const none = await openStream(`${srv.base}/api/v1/realtime/stream`);
      expect(none.status).toBe(400);
      expect(none.body.errors[0].code).toBe('no_rooms');
      const many = Array.from({ length: 21 }, (_, i) => `availability:property:P${i}`).join(',');
      expect((await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${many}`)).status).toBe(400);
      expect((await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}&extra=1`)).status).toBe(400);
      expect((await openStream(`${srv.base}/api/v1/realtime/stream?rooms[$ne]=x`)).status).toBe(400);
    } finally {
      await srv.close();
    }
  });

  it('cache:evict clears shared caches in the process and never reaches browsers', async () => {
    const cache = createCache({ max: 10, ttlMs: 60_000, clock, shared: true });
    cache.set('property:MBHT-ABC123:rates', 1);
    cache.set('property:OTHER:rates', 2);
    const srv = await serve();
    const s = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`);
    try {
      await s.next('ready');
      await publishCacheEvict('property:MBHT-ABC123:', { clock });
      await expect.poll(() => cache.get('property:MBHT-ABC123:rates'), { timeout: 4000 }).toBeUndefined();
      expect(cache.get('property:OTHER:rates')).toBe(2);
      expect(s.events.map((e) => e.event)).toEqual(['ready']);
    } finally {
      s.close();
      await srv.close();
    }
  });

  it('a reconnecting browser gets what it missed (Last-Event-ID); too old → resync', async () => {
    const srv = await serve();
    try {
      const first = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`);
      await first.next('ready');
      const seen = first.next('availability:changed');
      await publish(AVAIL, 'availability:changed', { n: 1 }, { clock });
      const lastId = (await seen).id;
      first.close();
      await publish(AVAIL, 'availability:changed', { n: 2 }, { clock });
      await publish('availability:property:OTHER', 'availability:changed', { n: 99 }, { clock });
      await publish(AVAIL, 'availability:changed', { n: 3 }, { clock });

      const again = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`, { 'Last-Event-ID': lastId });
      await expect
        .poll(() => again.events.filter((e) => e.event === 'availability:changed').map((e) => e.data.data.n), { timeout: 4000 })
        .toEqual([2, 3]);
      again.close();

      const old = b2bMongoose.Types.ObjectId.createFromTime(Math.floor(Date.now() / 1000) - 600).toHexString();
      const stale = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`, { 'Last-Event-ID': old });
      await stale.next('resync');
      stale.close();
    } finally {
      await srv.close();
    }
  });

  it('signals replayed on reconnect are not sent again when the live feed catches up', async () => {
    const id = (/** @type {number} */ n) => b2bMongoose.Types.ObjectId.createFromTime(Math.floor(Date.now() / 1000) - 60 + n);
    /** @type {import('../../src/b2b/core/realtime/signals.js').Signal[]} */
    const stored = [1, 2].map((n) => ({ _id: id(n), room: AVAIL, event: 'availability:changed', data: { n }, at: new Date() }));
    const own = newHub({ readSince: async () => stored });
    const srv = await serve({ hub: own });
    const s = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`, { 'Last-Event-ID': id(0).toHexString() });
    try {
      await expect.poll(() => s.events.filter((e) => e.event === 'availability:changed').length, { timeout: 4000 }).toBe(2);
      for (const signal of stored) own.deliver(signal); // the slow live feed delivers the same two
      own.deliver({ _id: id(3), room: AVAIL, event: 'availability:changed', data: { n: 3 }, at: new Date() });
      await expect
        .poll(() => s.events.filter((e) => e.event === 'availability:changed').map((e) => e.data.data.n), { timeout: 4000 })
        .toEqual([1, 2, 3]);
    } finally {
      s.close();
      own.close();
      await srv.close();
    }
  });

  it('a live signal arriving DURING the catch-up is held and sent once, in order', async () => {
    const id = (/** @type {number} */ n) => b2bMongoose.Types.ObjectId.createFromTime(Math.floor(Date.now() / 1000) - 60 + n);
    /** @param {number} n @returns {import('../../src/b2b/core/realtime/signals.js').Signal} */
    const sig = (n) => ({ _id: id(n), room: AVAIL, event: 'availability:changed', data: { n }, at: new Date() });
    /** @type {(v: any[]) => void} */
    let finishReplay = () => {};
    let replayStarted = () => {};
    const started = new Promise((r) => {
      replayStarted = () => r(undefined);
    });
    const own = newHub({
      readSince: () => {
        replayStarted();
        return new Promise((resolve) => {
          finishReplay = resolve;
        });
      },
    });
    const srv = await serve({ hub: own });
    const s = await openStream(`${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`, { 'Last-Event-ID': id(1).toHexString() });
    expect({ status: s.status, body: s.body }).toEqual({ status: 200, body: null }); // shows the refusal if this ever flakes again
    try {
      await started;
      own.deliver(sig(3)); // the live feed is faster than the catch-up read
      finishReplay([sig(2), sig(3)]);
      await expect
        .poll(() => s.events.filter((e) => e.event === 'availability:changed').map((e) => e.data.data.n), { timeout: 4000 })
        .toEqual([2, 3]);
      own.deliver(sig(4));
      await expect
        .poll(() => s.events.filter((e) => e.event === 'availability:changed').map((e) => e.data.data.n), { timeout: 4000 })
        .toEqual([2, 3, 4]);
    } finally {
      s.close();
      own.close();
      await srv.close();
    }
  });

  it('limits live connections per IP', async () => {
    const small = newHub({ maxPerIp: 2 });
    const srv = await serve({ hub: small });
    const url = `${srv.base}/api/v1/realtime/stream?rooms=${AVAIL}`;
    const s1 = await openStream(url);
    const s2 = await openStream(url);
    try {
      await s1.next('ready');
      await s2.next('ready');
      expect((await openStream(url)).status).toBe(429);
      s1.close();
      await expect.poll(() => small.stats().connections, { timeout: 2000 }).toBe(1);
      const s3 = await openStream(url);
      expect(s3.status).toBe(200);
      s3.close();
    } finally {
      s2.close();
      small.close();
      await srv.close();
    }
  });
});

describe('background work inside the backend process', () => {
  it('runs queued jobs, delivers signals, and stops cleanly', async () => {
    /** @type {unknown[]} */
    const ran = [];
    jobHandlers.set('test-ping', async (payload) => {
      ran.push(payload);
    });
    /** @type {string[]} */
    const delivered = [];
    const bg = startBackground({ clock, logger: quiet, runJobs: true, hub: { deliver: (s) => delivered.push(s.event) } });
    try {
      await enqueue({ name: 'test-ping', payload: { n: 7 }, clock });
      await expect.poll(() => ran, { timeout: 6000 }).toEqual([{ n: 7 }]);
      await expect.poll(async () => (await JobRecord.findOne({ name: 'test-ping' }).lean())?.status, { timeout: 4000 }).toBe('DONE');
      await publish(AVAIL, 'availability:changed', { n: 1 }, { clock });
      await expect.poll(() => delivered, { timeout: 4000 }).toContain('availability:changed');
    } finally {
      await bg.stop();
      jobHandlers.delete('test-ping');
    }
  });

  it('with B2B_BACKGROUND=false only live updates run (no jobs claimed)', async () => {
    jobHandlers.set('test-off', async () => {});
    const bg = startBackground({ clock, logger: quiet, runJobs: false, hub: { deliver: () => {} } });
    try {
      await enqueue({ name: 'test-off', clock });
      await new Promise((r) => setTimeout(r, 1200));
      expect((await JobRecord.findOne({ name: 'test-off' }).lean())?.status).toBe('READY');
    } finally {
      await bg.stop();
      jobHandlers.delete('test-off');
      await JobRecord.deleteMany({ name: 'test-off' });
    }
  });
});

describe('signals', () => {
  it('publish refuses invalid rooms, event names and large payloads', async () => {
    await expect(publish('users', 'x', {}, { clock })).rejects.toThrow(/invalid room/);
    await expect(publish('b2b:org:o1', 'Bad Event', {}, { clock })).rejects.toThrow(/invalid event/);
    await expect(publish('b2b:org:o1', 'big', { blob: 'x'.repeat(3000) }, { clock })).rejects.toThrow(/too large/);
    expect(isValidRoom('availability:property:../../x')).toBe(false);
    expect(roomsForActor({ type: 'anonymous' })).toEqual([]);
  });
});
