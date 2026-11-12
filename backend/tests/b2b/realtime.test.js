// @ts-check
import express from 'express';
import http from 'node:http';
import { io as connect } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { isValidRoom, roomsForActor } from '../../src/b2b/core/realtime/rooms.js';
import { createRealtimeServer } from '../../src/b2b/core/realtime/server.js';
import { createSignalReader, publish, publishCacheEvict } from '../../src/b2b/core/realtime/signals.js';
import { signRealtimeToken, verifyRealtimeToken } from '../../src/b2b/core/realtime/token.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const clock = { now: () => new Date() };
const quiet = createLogger({ write: () => {} });

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {http.Server} */
let httpServer;
/** @type {ReturnType<typeof createRealtimeServer>} */
let realtime;
/** @type {ReturnType<typeof createSignalReader>} */
let reader;
let url = '';

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  httpServer = http.createServer();
  realtime = createRealtimeServer({ httpServer, secret: SECRET, origins: [], clock, logger: quiet });
  reader = createSignalReader({ onSignal: (s) => realtime.deliver(s), clock, logger: quiet, retryMs: 50 });
  await new Promise((r) => httpServer.listen(0, () => r(undefined)));
  url = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (httpServer.address()).port}`;
  reader.start();
});
afterAll(async () => {
  await reader.stop();
  await realtime.close();
  await mongo.stop();
});

/** @param {Record<string, unknown>} [auth] */
async function client(auth) {
  const socket = connect(url, { transports: ['websocket'], auth, reconnection: false, forceNew: true });
  await new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(undefined));
    socket.once('connect_error', reject);
  });
  return socket;
}

/** @param {import('socket.io-client').Socket} socket @param {string} event @param {number} [ms] */
const next = (socket, event, ms = 4000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`no "${event}" within ${ms} ms`)), ms);
  socket.once(event, (data) => { clearTimeout(t); resolve(data); });
});

describe('realtime delivery through MongoDB signals', () => {
  it('a signed-in member receives events for their org room', async () => {
    const { token } = signRealtimeToken({ sub: 'u1', rooms: roomsForActor({ type: 'member', userId: 'u1', orgId: 'org1', permissions: [] }) }, { secret: SECRET, clock });
    const socket = await client({ token });
    try {
      const received = next(socket, 'notification:new');
      await publish('b2b:org:org1', 'notification:new', { inboxId: 'n1' }, { clock });
      expect(await received).toEqual({ inboxId: 'n1' });
    } finally {
      socket.close();
    }
  });

  it('anonymous visitors can follow availability of a property, but not personal rooms', async () => {
    const socket = await client();
    try {
      expect(await socket.emitWithAck('subscribe', 'availability:property:MBHT-ABC123')).toEqual({ ok: true });
      expect(await socket.emitWithAck('subscribe', 'b2b:org:org1')).toEqual({ ok: false, code: 'ROOM_NOT_ALLOWED' });
      const received = next(socket, 'availability:changed');
      await publish('availability:property:MBHT-ABC123', 'availability:changed', { dates: ['2026-12-31'] }, { clock });
      expect(await received).toEqual({ dates: ['2026-12-31'] });
    } finally {
      socket.close();
    }
  });

  it('other orgs do not receive the signal; cache:evict never reaches browsers', async () => {
    const { token } = signRealtimeToken({ sub: 'u2', rooms: ['b2b:org:org2'] }, { secret: SECRET, clock });
    const socket = await client({ token });
    try {
      let got = 0;
      socket.onAny(() => { got += 1; });
      await publish('b2b:org:org1', 'notification:new', { inboxId: 'n2' }, { clock });
      await publishCacheEvict('property:MBHT-ABC123:', { clock });
      await new Promise((r) => setTimeout(r, 1500));
      expect(got).toBe(0);
    } finally {
      socket.close();
    }
  });

  it('a forged or expired token is refused at the handshake', async () => {
    const forged = signRealtimeToken({ sub: 'x', rooms: ['b2b:org:org1'] }, { secret: 'another-secret-of-at-least-32-characters!!', clock }).token;
    await expect(client({ token: forged })).rejects.toThrow(/INVALID_TOKEN/);
  });
});

describe('signals and tokens', () => {
  it('publish refuses invalid rooms, event names and large payloads', async () => {
    await expect(publish('users', 'x', {}, { clock })).rejects.toThrow(/invalid room/);
    await expect(publish('b2b:org:o1', 'Bad Event', {}, { clock })).rejects.toThrow(/invalid event/);
    await expect(publish('b2b:org:o1', 'big', { blob: 'x'.repeat(3000) }, { clock })).rejects.toThrow(/too large/);
    expect(isValidRoom('availability:property:../../x')).toBe(false);
  });

  it('tokens expire, are bound to the audience, and refuse short secrets', () => {
    const t0 = { now: () => new Date('2026-11-12T10:00:00Z') };
    const { token, expiresIn } = signRealtimeToken({ sub: 'u', rooms: ['b2b:user:u'] }, { secret: SECRET, clock: t0, ttlSeconds: 3600 });
    expect(expiresIn).toBe(900); // capped at 15 min
    expect(verifyRealtimeToken(token, { secret: SECRET, clock: t0 })).toEqual({ sub: 'u', rooms: ['b2b:user:u'] });
    expect(verifyRealtimeToken(token, { secret: SECRET, clock: { now: () => new Date('2026-11-12T10:15:01Z') } })).toBeNull();
    expect(verifyRealtimeToken(token.slice(0, -2) + 'xx', { secret: SECRET, clock: t0 })).toBeNull();
    expect(() => signRealtimeToken({ sub: 'u', rooms: [] }, { secret: 'short', clock: t0 })).toThrow(/32 characters/);
  });
});

describe('GET /api/v1/realtime/token', () => {
  it('needs a signed-in caller and returns their rooms', async () => {
    const make = (/** @type {any} */ actor) => {
      const app = express();
      app.use('/api/v1', createB2BRouter({ connect: false, logger: quiet, env: { B2B_REALTIME_SECRET: SECRET }, authenticate: async () => actor }));
      return startServer(app);
    };
    const anon = await make(null);
    expect((await anon.get('/api/v1/realtime/token')).status).toBe(401);
    await anon.close();
    const customer = await make({ type: 'customer', customerId: 'c9' });
    const res = await customer.get('/api/v1/realtime/token');
    await customer.close();
    expect(res.status).toBe(200);
    expect(verifyRealtimeToken(res.body.token, { secret: SECRET, clock })?.rooms).toEqual(['b2b:customer:c9']);
  });
});
