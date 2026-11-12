// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { fixedClock } from '../../src/b2b/core/clock.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const clock = fixedClock(new Date('2026-11-12T10:00:00Z'));
const deps = { clock, owner: 'test' };

beforeAll(async () => {
  mongo = await startMongo();
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await mongo.db.dropDatabase();
  await mongo.db.collection('users').insertOne({ email: 'existing@example.com' });
});

/** @type {import('../../src/b2b/core/db/migrations.js').Migration} */
const createProperties = {
  id: '0001-htl-properties',
  description: 'hotel properties',
  up: async (ctx) => {
    await ctx.createCollection('htl_probe_properties', { validator: { $jsonSchema: { required: ['name'] } } });
    await ctx.createIndex('htl_probe_properties', { slug: 1 }, { name: 'slug_unique', unique: true });
  },
};

describe('migration runner', () => {
  it('applies pending migrations once and records them', async () => {
    expect(await runMigrations([createProperties], deps)).toEqual({ applied: ['0001-htl-properties'], skipped: [] });
    expect(await runMigrations([createProperties], deps)).toEqual({ applied: [], skipped: ['0001-htl-properties'] });

    const indexes = await mongo.db.collection('htl_probe_properties').indexes();
    expect(indexes.map((i) => i.name)).toContain('slug_unique');
    await expect(mongo.db.collection('htl_probe_properties').insertOne({ slug: 'x' })).rejects.toThrow(/validation/i);
  });

  it('refuses to touch an existing collection — and leaves it unchanged', async () => {
    const before = await mongo.db.collection('users').indexes();
    /** @type {import('../../src/b2b/core/db/migrations.js').Migration} */
    const evil = { id: '0002-evil', description: 'x', up: (ctx) => ctx.createIndex('users', { email: 1 }, { name: 'e' }) };
    await expect(runMigrations([evil], deps)).rejects.toThrow(/"users" is not allowed/);
    expect(await mongo.db.collection('users').indexes()).toEqual(before);
    expect(await mongo.db.collection('core_migrations').findOne({ _id: /** @type {any} */ ('0002-evil') })).toBeNull();
  });

  it('refuses badly named or duplicate migration ids', async () => {
    await expect(runMigrations([{ ...createProperties, id: 'props' }], deps)).rejects.toThrow(/0001-short-name/);
    await expect(runMigrations([createProperties, createProperties], deps)).rejects.toThrow(/duplicate/);
  });

  it('a second runner cannot run while the lock is held', async () => {
    await mongo.db.collection('core_migrations').insertOne({
      _id: /** @type {any} */ ('__lock'),
      lockedBy: 'other',
      lockedUntil: new Date('2026-11-12T10:05:00Z'),
    });
    await expect(runMigrations([createProperties], deps)).rejects.toThrow(/holds the lock/);
  });

  it('creates capped collections (for rt_signals)', async () => {
    /** @type {import('../../src/b2b/core/db/migrations.js').Migration} */
    const capped = {
      id: '0003-rt-probe',
      description: 'x',
      up: (ctx) => ctx.createCollection('rt_probe', { cappedSizeBytes: 1024 * 1024 }),
    };
    await runMigrations([capped], deps);
    const [info] = await mongo.db.listCollections({ name: 'rt_probe' }).toArray();
    expect(/** @type {any} */ (info)?.options?.capped).toBe(true);
  });
});
