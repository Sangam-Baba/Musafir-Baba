// @ts-check
/**
 * Realtime signals through MongoDB (no Redis, no change streams — D22, D28):
 * - publish(): any B2B process inserts a small document into the capped `rt_signals`.
 * - createSignalReader(): each backend process reads new signals with ONE tailable cursor
 *   (works on the standalone production server) and hands them to its SSE streams and caches.
 *   After a restart it starts from "now − maxAge"; older signals are skipped (the stored
 *   notification inbox + catch-up cover them — 11-… §6).
 */
import { b2bMongoose } from '../db/connection.js';
import { CACHE_EVICT_ROOM, isValidRoom } from './rooms.js';

export const SIGNALS_COLLECTION = 'rt_signals';
export const SIGNALS_CAPPED_BYTES = 64 * 1024 * 1024;
const MAX_DATA_BYTES = 2048;
const EVENT_NAME = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/;

/** @typedef {{ _id?: import('mongodb').ObjectId, room: string, event: string, data: Record<string, unknown>, at: Date }} Signal */

/** @returns {import('mongodb').Collection<Signal>} */
function collection() {
  const db = b2bMongoose.connection.db;
  if (!db) throw new Error('[b2b] realtime: database not connected');
  return /** @type {any} */ (db).collection(SIGNALS_COLLECTION);
}

/**
 * @param {string} room e.g. 'availability:property:MBHT-ABC123'
 * @param {string} event e.g. 'availability:changed'
 * @param {Record<string, unknown>} data ids and short text only
 * @param {{ clock: import('../clock.js').Clock }} deps
 */
export async function publish(room, event, data, deps) {
  if (!isValidRoom(room)) throw new Error(`[b2b] realtime: invalid room "${room}"`);
  if (!EVENT_NAME.test(event)) throw new Error(`[b2b] realtime: invalid event name "${event}"`);
  if (Buffer.byteLength(JSON.stringify(data)) > MAX_DATA_BYTES) throw new Error('[b2b] realtime: signal data too large (ids only)');
  await collection().insertOne({ room, event, data, at: deps.clock.now() });
}

/** Ask every API process to drop cached entries starting with `prefix`. @param {string} prefix @param {{ clock: import('../clock.js').Clock }} deps */
export function publishCacheEvict(prefix, deps) {
  return publish(CACHE_EVICT_ROOM, 'cache:evict', { prefix }, deps);
}

/**
 * Signals for `rooms` written after `afterId` (oldest first) — the catch-up for a reconnecting stream.
 * Uses the `_id` index of the capped collection, so it reads at most `limit` recent documents.
 * @param {import('mongodb').ObjectId} afterId
 * @param {readonly string[]} rooms
 * @param {number} limit
 * @returns {Promise<Signal[]>}
 */
export function readSignalsSince(afterId, rooms, limit) {
  return collection()
    .find({ _id: { $gt: afterId }, room: { $in: [...rooms] } })
    .sort({ _id: 1 })
    .limit(limit)
    .toArray();
}

/**
 * @param {{ onSignal: (s: Signal) => void, clock: import('../clock.js').Clock, logger: import('../logger.js').Logger,
 *   maxAgeMs?: number, retryMs?: number }} options
 */
export function createSignalReader(options) {
  const retryMs = options.retryMs ?? 500;
  let lastId = b2bMongoose.Types.ObjectId.createFromTime(
    Math.floor((options.clock.now().getTime() - (options.maxAgeMs ?? 120_000)) / 1000),
  );
  let running = false;
  /** @type {import('mongodb').FindCursor<Signal> | null} */
  let cursor = null;
  /** @type {Promise<void> | null} */
  let loop = null;

  async function readOnce() {
    cursor = collection().find({ _id: { $gt: lastId } }, { tailable: true, awaitData: true, maxAwaitTimeMS: 1000 });
    for await (const signal of cursor) {
      if (!running) break;
      if (signal._id) lastId = signal._id;
      try {
        options.onSignal(signal);
      } catch (error) {
        options.logger.error({ err: error, room: signal.room }, 'realtime: signal handler failed');
      }
    }
  }

  async function run() {
    while (running) {
      try {
        await readOnce();
      } catch (error) {
        if (running) options.logger.warn({ err: error }, 'realtime: signal cursor closed, retrying');
      }
      if (running) await new Promise((r) => setTimeout(r, retryMs).unref());
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      loop = run().catch((error) => {
        running = false;
        options.logger.error({ err: error }, 'realtime: signal reader stopped after an unexpected error');
      });
    },
    async stop() {
      running = false;
      await cursor?.close().catch(() => {});
      await loop;
    },
  };
}
