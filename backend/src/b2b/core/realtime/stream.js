// @ts-check
/**
 * Live updates over Server-Sent Events, served by the existing backend on the same address
 * (GET /api/v1/realtime/stream — ADR-0015, docs/plan/11-notifications-and-realtime.md §5).
 * No extra port, hostname, process or package; browsers have SSE built in.
 *
 * - One hub per process. The signal reader (one tailable cursor on `rt_signals`) calls deliver().
 * - The route decides the rooms: personal rooms from the caller's login, plus public
 *   availability rooms the browser asks for. The hub only delivers.
 * - Limits per IP and in total; slow readers are dropped instead of buffering in the shared process.
 * - A comment line every 25 s keeps Cloudflare and proxies from closing an idle connection.
 * - Every message carries the signal id. A reconnecting browser sends Last-Event-ID and gets what it
 *   missed (at most 2 min / 100 signals). If that is too old, a `resync` event tells it to reload its data.
 * - Messages carry ids and short titles only — never prices, guest data or secrets.
 */
import { AppError } from '../errors.js';
import { CACHE_EVICT_ROOM } from './rooms.js';

const OBJECT_ID = /^[0-9a-f]{24}$/;
const RESYNC = 'event: resync\ndata: {}\n\n';

/** @typedef {import('./signals.js').Signal} Signal */
/** @typedef {{ res: import('express').Response, rooms: ReadonlySet<string>, ip: string }} StreamClient */
/** @typedef {(client: StreamClient, frame: string) => void} Write */

/** @param {Signal} signal */
const frameOf = (signal) =>
  `id: ${String(signal._id ?? '')}\nevent: ${signal.event}\ndata: ${JSON.stringify({ room: signal.room, data: signal.data })}\n\n`;

/** Who is connected, by room and by IP. */
function createRegistry() {
  /** @type {Set<StreamClient>} */
  const clients = new Set();
  /** @type {Map<string, Set<StreamClient>>} */
  const byRoom = new Map();
  /** @type {Map<string, number>} */
  const perIp = new Map();
  return {
    clients,
    /** @param {string} room */
    inRoom: (room) => [...(byRoom.get(room) ?? [])],
    /** @param {string} ip */
    countFor: (ip) => perIp.get(ip) ?? 0,
    roomCount: () => byRoom.size,
    /** @param {StreamClient} client */
    add(client) {
      clients.add(client);
      perIp.set(client.ip, (perIp.get(client.ip) ?? 0) + 1);
      for (const room of client.rooms) byRoom.set(room, (byRoom.get(room) ?? new Set()).add(client));
    },
    /** @param {StreamClient} client */
    remove(client) {
      if (!clients.delete(client)) return;
      for (const room of client.rooms) {
        const set = byRoom.get(room);
        set?.delete(client);
        if (set?.size === 0) byRoom.delete(room);
      }
      const n = (perIp.get(client.ip) ?? 1) - 1;
      if (n <= 0) perIp.delete(client.ip);
      else perIp.set(client.ip, n);
    },
  };
}

/**
 * Writes a frame; drops the client when its connection is gone or it reads too slowly.
 * @param {ReturnType<typeof createRegistry>} registry
 * @param {import('../logger.js').Logger} logger
 * @param {number} maxBufferBytes
 * @returns {Write}
 */
function createWriter(registry, logger, maxBufferBytes) {
  return (client, frame) => {
    const { res } = client;
    if (res.writableEnded || res.destroyed) return registry.remove(client);
    res.write(frame);
    if (res.writableLength > maxBufferBytes) {
      logger.warn({ ip: client.ip, buffered: res.writableLength }, 'realtime: slow reader dropped');
      registry.remove(client);
      res.end();
    }
  };
}

/**
 * Sends what a reconnecting client missed since `lastEventId`, or `resync` if that is too old or too much.
 * @param {StreamClient} client
 * @param {string | undefined} lastEventId
 * @param {{ write: Write, clock: import('../clock.js').Clock, maxAgeMs: number, limit: number,
 *   readSince: (afterId: import('mongodb').ObjectId, rooms: readonly string[], limit: number) => Promise<Signal[]>,
 *   objectIdFrom: (hex: string) => import('mongodb').ObjectId }} deps
 */
async function replay(client, lastEventId, deps) {
  if (!lastEventId || !OBJECT_ID.test(lastEventId)) return;
  const afterId = deps.objectIdFrom(lastEventId);
  if (deps.clock.now().getTime() - afterId.getTimestamp().getTime() > deps.maxAgeMs) return deps.write(client, RESYNC);
  const missed = await deps.readSince(afterId, [...client.rooms], deps.limit);
  for (const signal of missed) deps.write(client, frameOf(signal));
  if (missed.length === deps.limit) deps.write(client, RESYNC);
}

/**
 * @param {{ clock: import('../clock.js').Clock, logger: import('../logger.js').Logger,
 *   readSince: (afterId: import('mongodb').ObjectId, rooms: readonly string[], limit: number) => Promise<Signal[]>,
 *   objectIdFrom: (hex: string) => import('mongodb').ObjectId,
 *   maxPerIp?: number, maxTotal?: number, heartbeatMs?: number, maxBufferBytes?: number,
 *   replayMaxAgeMs?: number, replayLimit?: number }} options
 */
export function createStreamHub(options) {
  const maxPerIp = options.maxPerIp ?? 20;
  const maxTotal = options.maxTotal ?? 5000;
  const registry = createRegistry();
  const write = createWriter(registry, options.logger, options.maxBufferBytes ?? 64 * 1024);
  const replayDeps = { ...options, write, maxAgeMs: options.replayMaxAgeMs ?? 120_000, limit: options.replayLimit ?? 100 };
  const heartbeat = setInterval(() => {
    for (const client of [...registry.clients]) write(client, ': ping\n\n');
  }, options.heartbeatMs ?? 25_000);
  heartbeat.unref(); // never keeps the backend process alive or delays its shutdown

  return {
    /**
     * Starts a stream. Throws (before any byte is written) when a limit is reached.
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {{ rooms: readonly string[], ip: string, lastEventId?: string | undefined }} input
     */
    async open(req, res, input) {
      if (registry.clients.size >= maxTotal) throw new AppError('TOO_MANY_CONNECTIONS', 503, 'Live updates are busy, try again shortly');
      if (registry.countFor(input.ip) >= maxPerIp) throw new AppError('TOO_MANY_CONNECTIONS', 429, 'Too many live connections');
      res
        .status(200)
        .set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      /** @type {StreamClient} */
      const client = { res, rooms: new Set(input.rooms), ip: input.ip };
      registry.add(client);
      req.on('close', () => registry.remove(client));
      write(client, `retry: 3000\nevent: ready\ndata: ${JSON.stringify({ rooms: [...client.rooms] })}\n\n`);
      await replay(client, input.lastEventId, replayDeps).catch((/** @type {unknown} */ error) => {
        options.logger.warn({ err: error }, 'realtime: catch-up failed, asking the browser to reload');
        write(client, RESYNC);
      });
    },
    /** @param {Signal} signal */
    deliver(signal) {
      if (signal.room === CACHE_EVICT_ROOM) return; // for server caches, never browsers
      const clients = registry.inRoom(signal.room);
      if (clients.length === 0) return;
      const frame = frameOf(signal);
      for (const client of clients) write(client, frame);
    },
    /** @returns {{ connections: number, rooms: number }} */
    stats: () => ({ connections: registry.clients.size, rooms: registry.roomCount() }),
    close() {
      clearInterval(heartbeat);
      for (const client of [...registry.clients]) {
        registry.remove(client);
        client.res.end();
      }
    },
  };
}
