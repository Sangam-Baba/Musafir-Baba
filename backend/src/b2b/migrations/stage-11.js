// @ts-check
/** Stage 11 — client wallets and credit (new `wal_` collections only). */
import { HOLDS_COLLECTION } from '../modules/wallet/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_11 = [
  {
    id: '0065-wal-holds',
    description: 'Money holds: unique key; per client newest first; due to expire; stuck half-way (reconciler)',
    up: async (ctx) => {
      await ctx.createCollection(HOLDS_COLLECTION);
      await ctx.createIndex(HOLDS_COLLECTION, { key: 1 }, { name: 'key_unique', unique: true });
      await ctx.createIndex(HOLDS_COLLECTION, { clientOrgId: 1, createdAt: -1 }, { name: 'client' });
      await ctx.createIndex(HOLDS_COLLECTION, { status: 1, expiresAt: 1 }, { name: 'status_expiry' });
      await ctx.createIndex(HOLDS_COLLECTION, { status: 1, statusAt: 1 }, { name: 'status_age' });
    },
  },
];
