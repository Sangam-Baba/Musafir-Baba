// @ts-check
/**
 * Event relay + consumers (pattern P5, docs/plan/01-architecture.md §8.1).
 *
 * Relay (worker, every 500 ms): documents with `hasPendingEvents: true` →
 *   1. insert each event into `core_outbox` (_id = eventId, so a repeat is harmless)
 *   2. enqueue one job per subscribed consumer (dedupeKey = consumer:eventId, so a repeat is harmless)
 *   3. pull the events from the document (and clear the flag only if no new event arrived)
 * A crash between steps just repeats them — nothing is lost and nothing is sent twice.
 * Several relays may run at once (several worker containers); every step is repeat-safe.
 *
 * Consumers: the `event:<consumer>` job loads the event, skips it if `core_inbox` already has
 * (consumer, eventId), runs the handler, then records it. Handlers must be idempotent too
 * (a crash after the handler but before the record re-runs it).
 */
import { b2bMongoose } from './connection.js';
import { defineModel } from './model.js';
import { systemScope } from './tenant-plugin.js';
import { enqueue } from '../jobs/queue.js';

export const OUTBOX_COLLECTION = 'core_outbox';
export const INBOX_COLLECTION = 'core_inbox';
const DUPLICATE_KEY = 11000;
const RELAY_SCOPE = systemScope('event-relay', { routine: true });

const outboxSchema = new b2bMongoose.Schema(
  {
    _id: { type: String }, // eventId
    type: { type: String, required: true },
    version: { type: Number, required: true },
    occurredAt: { type: Date, required: true },
    payload: { type: b2bMongoose.Schema.Types.Mixed, default: {} },
    sourceCollection: { type: String, required: true }, // `collection` is reserved by Mongoose
    sourceId: { type: String, required: true },
    relayedAt: { type: Date, required: true },
  },
  { versionKey: false },
);
export const OutboxEvent = defineModel('OutboxEvent', outboxSchema, OUTBOX_COLLECTION);

const inboxSchema = new b2bMongoose.Schema(
  {
    _id: { type: String },
    consumer: { type: String, required: true },
    eventId: { type: String, required: true },
    processedAt: { type: Date, required: true },
  },
  { versionKey: false },
);
export const InboxRecord = defineModel('InboxRecord', inboxSchema, INBOX_COLLECTION);

/** @typedef {import('./events.js').DomainEvent} DomainEvent */
/** @typedef {(event: DomainEvent) => Promise<void>} EventHandler */
/** @typedef {{ consumer: string, types: readonly string[], handler: EventHandler }} Subscription */

/** @returns {{ subscribe: (s: Subscription) => void, consumersFor: (type: string) => string[], handlerFor: (consumer: string) => EventHandler | undefined, all: () => readonly Subscription[] }} */
export function createEventBus() {
  /** @type {Map<string, Subscription>} */
  const subs = new Map();
  return {
    subscribe(s) {
      if (!/^[a-z][a-z0-9-]*$/.test(s.consumer)) throw new Error(`[b2b] consumer name "${s.consumer}" must be kebab-case`);
      if (subs.has(s.consumer)) throw new Error(`[b2b] consumer "${s.consumer}" subscribed twice`);
      subs.set(s.consumer, s);
    },
    consumersFor: (type) => [...subs.values()].filter((s) => s.types.includes(type)).map((s) => s.consumer),
    handlerFor: (consumer) => subs.get(consumer)?.handler,
    all: () => [...subs.values()],
  };
}

/** @param {unknown} error */
const isDuplicate = (error) => /** @type {{ code?: number }} */ (error)?.code === DUPLICATE_KEY;

/**
 * Relays all pending events of one source collection (one batch). Returns how many events moved.
 * @param {import('mongoose').Model<any>} source
 * @param {ReturnType<typeof createEventBus>} bus
 * @param {import('../clock.js').Clock} clock
 * @param {number} [batchSize]
 */
export async function relayOnce(source, bus, clock, batchSize = 100) {
  const docs = await source.find({ hasPendingEvents: true }, { pendingEvents: 1 }).setOptions(RELAY_SCOPE).limit(batchSize).lean();
  let moved = 0;
  for (const doc of docs) {
    const events = /** @type {DomainEvent[]} */ (doc.pendingEvents ?? []);
    for (const event of events) {
      await publish(event, { sourceCollection: source.collection.collectionName, sourceId: String(doc._id) }, bus, clock);
      moved += 1;
    }
    const ids = events.map((e) => e.eventId);
    await source.updateOne({ _id: doc._id }, { $pull: { pendingEvents: { eventId: { $in: ids } } } }).setOptions(RELAY_SCOPE);
    await source
      .updateOne({ _id: doc._id, pendingEvents: { $size: 0 } }, { $unset: { pendingEvents: '', hasPendingEvents: '' } })
      .setOptions(RELAY_SCOPE);
  }
  return moved;
}

/**
 * @param {DomainEvent} event
 * @param {{ sourceCollection: string, sourceId: string }} source
 * @param {ReturnType<typeof createEventBus>} bus
 * @param {import('../clock.js').Clock} clock
 */
async function publish(event, source, bus, clock) {
  try {
    await OutboxEvent.create({
      _id: event.eventId,
      type: event.type,
      version: event.version,
      occurredAt: event.occurredAt,
      payload: event.payload,
      ...source,
      relayedAt: clock.now(),
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
  for (const consumer of bus.consumersFor(event.type)) {
    await enqueue({ name: `event:${consumer}`, payload: { eventId: event.eventId }, dedupeKey: `${consumer}:${event.eventId}`, clock });
  }
}

/**
 * Job handlers for every consumer — register them in the worker's job handler map.
 * @param {ReturnType<typeof createEventBus>} bus
 * @param {import('../clock.js').Clock} clock
 * @returns {Map<string, import('../jobs/runner.js').JobHandler>}
 */
export function consumerJobHandlers(bus, clock) {
  const handlers = new Map();
  for (const { consumer } of bus.all()) {
    handlers.set(`event:${consumer}`, async (/** @type {Record<string, unknown>} */ payload) => {
      const eventId = String(payload.eventId);
      const inboxId = `${consumer}:${eventId}`;
      if (await InboxRecord.exists({ _id: inboxId })) return;
      const stored = await OutboxEvent.findById(eventId).lean();
      if (!stored) throw new Error(`event ${eventId} not found in outbox`);
      const handler = bus.handlerFor(consumer);
      if (!handler) throw new Error(`consumer ${consumer} has no handler`);
      await handler({ eventId, type: stored.type, version: stored.version, occurredAt: stored.occurredAt, payload: stored.payload ?? {} });
      try {
        await InboxRecord.create({ _id: inboxId, consumer, eventId, processedAt: clock.now() });
      } catch (error) {
        if (!isDuplicate(error)) throw error;
      }
    });
  }
  return handlers;
}

/**
 * Relay loop for the worker.
 * @param {{ sources: readonly import('mongoose').Model<any>[], bus: ReturnType<typeof createEventBus>, clock: import('../clock.js').Clock,
 *   logger: import('../logger.js').Logger, intervalMs?: number }} options
 */
export function createEventRelay(options) {
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {Promise<void>} */
  let current = Promise.resolve();
  let busy = false;
  const runAll = async () => {
    for (const source of options.sources) {
      try {
        await relayOnce(source, options.bus, options.clock);
      } catch (error) {
        options.logger.error({ source: source.modelName, err: error }, 'event relay failed');
      }
    }
  };
  return {
    runAll,
    start() {
      if (timer) return;
      timer = setInterval(() => {
        if (busy) return; // previous pass still running — skip instead of piling up
        busy = true;
        current = runAll()
          .catch((error) => options.logger.error({ err: error }, 'event relay pass crashed'))
          .finally(() => {
            busy = false;
          });
      }, options.intervalMs ?? 500);
      timer.unref(); // never keeps the backend process alive or delays its shutdown
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      await current;
    },
  };
}
