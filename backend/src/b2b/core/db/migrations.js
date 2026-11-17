// @ts-check
/**
 * Migration runner — the ONLY way B2B code creates collections, indexes and validators
 * (autoIndex/autoCreate are off). Every operation is checked against the allowed
 * prefixes, so a migration can never touch an existing collection (docs/plan/12-… D1, D3).
 *
 * Migrations get a restricted context, not the raw database. Each must be safe to run
 * twice. Applied ids are recorded in `core_migrations`; a lease lock stops two runners.
 */
import { b2bMongoose } from './connection.js';
import { assertAllowedCollection } from './prefixes.js';

/**
 * @typedef {object} MigrationContext
 * @property {(name: string, options?: { validator?: object, cappedSizeBytes?: number }) => Promise<void>} createCollection
 * @property {(name: string, keys: Record<string, 1 | -1 | '2dsphere' | 'text'>, options: { name: string, unique?: boolean, partialFilterExpression?: object, expireAfterSeconds?: number }) => Promise<void>} createIndex
 * @property {(name: string, validator: object) => Promise<void>} setValidator
 */
/** @typedef {{ id: string, description: string, up: (ctx: MigrationContext) => Promise<void> }} Migration */
/** @typedef {{ applied: string[], skipped: string[] }} MigrationResult */

const MIGRATIONS = 'core_migrations';
const LOCK_ID = '__lock';
const LOCK_MS = 10 * 60 * 1000;
const ID_FORMAT = /^\d{4}-[a-z0-9-]+$/;
const NAMESPACE_EXISTS = 48;

/** @returns {import('mongodb').Db} */
function database() {
  const db = b2bMongoose.connection.db;
  if (!db) throw new Error('[b2b] migrations: database not connected');
  return /** @type {import('mongodb').Db} */ (/** @type {unknown} */ (db));
}

/**
 * @param {import('mongodb').Db} db
 * @returns {MigrationContext}
 */
export function createMigrationContext(db) {
  return {
    async createCollection(name, options = {}) {
      assertAllowedCollection(name, 'migration createCollection');
      const capped = options.cappedSizeBytes ? { capped: true, size: options.cappedSizeBytes } : {};
      try {
        await db.createCollection(name, { ...capped, ...(options.validator ? { validator: options.validator } : {}) });
      } catch (error) {
        if (/** @type {{ code?: number }} */ (error).code !== NAMESPACE_EXISTS) throw error;
        if (options.validator) await this.setValidator(name, options.validator);
      }
    },
    async createIndex(name, keys, options) {
      assertAllowedCollection(name, 'migration createIndex');
      await db.collection(name).createIndex(keys, options);
    },
    async setValidator(name, validator) {
      assertAllowedCollection(name, 'migration setValidator');
      await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    },
  };
}

/** @param {readonly Migration[]} migrations */
function assertWellFormed(migrations) {
  const seen = new Set();
  for (const m of migrations) {
    if (!ID_FORMAT.test(m.id)) throw new Error(`[b2b] migration id "${m.id}" must look like 0001-short-name`);
    if (seen.has(m.id)) throw new Error(`[b2b] duplicate migration id "${m.id}"`);
    seen.add(m.id);
  }
}

/**
 * @param {readonly Migration[]} migrations  in the order they must run
 * @param {{ clock: import('../clock.js').Clock, owner: string }} deps
 * @returns {Promise<MigrationResult>}
 */
export async function runMigrations(migrations, { clock, owner }) {
  assertWellFormed(migrations);
  const db = database();
  /** @type {import('mongodb').Collection<{ _id: string, [k: string]: unknown }>} */
  const records = db.collection(MIGRATIONS);
  await acquireLock(records, clock, owner);
  try {
    return await applyPending(migrations, records, createMigrationContext(db), clock);
  } finally {
    await records.updateOne({ _id: LOCK_ID, lockedBy: owner }, { $set: { lockedUntil: new Date(0) } });
  }
}

/**
 * @param {readonly Migration[]} migrations
 * @param {import('mongodb').Collection<{ _id: string, [k: string]: unknown }>} records
 * @param {MigrationContext} ctx
 * @param {import('../clock.js').Clock} clock
 * @returns {Promise<MigrationResult>}
 */
async function applyPending(migrations, records, ctx, clock) {
  const done = new Set((await records.find({ _id: { $ne: LOCK_ID } }, { projection: { _id: 1 } }).toArray()).map((r) => r._id));
  /** @type {MigrationResult} */
  const result = { applied: [], skipped: [] };
  for (const m of migrations) {
    if (done.has(m.id)) {
      result.skipped.push(m.id);
      continue;
    }
    await m.up(ctx);
    await records.insertOne({ _id: m.id, description: m.description, appliedAt: clock.now() });
    result.applied.push(m.id);
  }
  return result;
}

/**
 * @param {import('mongodb').Collection<{ _id: string, [k: string]: unknown }>} records
 * @param {import('../clock.js').Clock} clock
 * @param {string} owner
 */
async function acquireLock(records, clock, owner) {
  const now = clock.now();
  try {
    await records.findOneAndUpdate(
      { _id: LOCK_ID, $or: [{ lockedUntil: { $lt: now } }, { lockedUntil: { $exists: false } }] },
      { $set: { lockedBy: owner, lockedUntil: new Date(now.getTime() + LOCK_MS) } },
      { upsert: true },
    );
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code === 11000) {
      throw new Error('[b2b] another migration run holds the lock — try again later');
    }
    throw error;
  }
}
