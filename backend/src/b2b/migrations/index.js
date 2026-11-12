// @ts-check
/**
 * All B2B migrations, in run order. Each module adds its own here as it is built
 * (e.g. `0003-htl-properties`). Ids are never renamed or reused.
 */
import { IDEMPOTENCY_COLLECTION } from '../core/db/idempotency.js';
import { JOBS_COLLECTION } from '../core/jobs/queue.js';
import { SCHEDULES_COLLECTION } from '../core/jobs/scheduler.js';

/** @type {readonly import('../core/db/migrations.js').Migration[]} */
export const MIGRATIONS = [
  {
    id: '0001-core-idempotency-keys',
    description: 'Idempotency records: one per (scope, key), deleted 24 h after creation',
    up: async (ctx) => {
      await ctx.createCollection(IDEMPOTENCY_COLLECTION);
      await ctx.createIndex(IDEMPOTENCY_COLLECTION, { scope: 1, key: 1 }, { name: 'scope_key_unique', unique: true });
      await ctx.createIndex(IDEMPOTENCY_COLLECTION, { expiresAt: 1 }, { name: 'expires_ttl', expireAfterSeconds: 0 });
    },
  },
  {
    id: '0002-core-jobs-and-schedules',
    description: 'Job queue (claim index, dedupe, DONE jobs removed after 7 days) and lease-locked schedules',
    up: async (ctx) => {
      await ctx.createCollection(JOBS_COLLECTION);
      await ctx.createIndex(JOBS_COLLECTION, { queue: 1, status: 1, runAt: 1 }, { name: 'claim' });
      await ctx.createIndex(JOBS_COLLECTION, { queue: 1, dedupeKey: 1 }, {
        name: 'dedupe_unique', unique: true, partialFilterExpression: { dedupeKey: { $exists: true } },
      });
      await ctx.createIndex(JOBS_COLLECTION, { finishedAt: 1 }, {
        name: 'done_ttl', expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: 'DONE' },
      });
      await ctx.createCollection(SCHEDULES_COLLECTION);
    },
  },
];
