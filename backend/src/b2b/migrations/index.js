// @ts-check
/**
 * All B2B migrations, in run order. Each module adds its own here as it is built
 * (e.g. `0002-htl-properties`). Ids are never renamed or reused.
 */
import { IDEMPOTENCY_COLLECTION } from '../core/db/idempotency.js';

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
];
