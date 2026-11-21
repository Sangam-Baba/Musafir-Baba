// @ts-check
/** Stage 11 — client wallets and credit (new `wal_` collections only). */
import { HOLDS_COLLECTION, MANUAL_TOPUPS_COLLECTION } from '../modules/wallet/index.js';

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
  {
    id: '0066-wal-manual-topups',
    description: 'Bank-transfer top-ups: unique reference; a UTR in use once; per client newest first; by status (approval queue)',
    up: async (ctx) => {
      await ctx.createCollection(MANUAL_TOPUPS_COLLECTION);
      await ctx.createIndex(MANUAL_TOPUPS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(
        MANUAL_TOPUPS_COLLECTION,
        { utrKey: 1 },
        { name: 'utr_unique', unique: true, partialFilterExpression: { utrKey: { $type: 'string' } } },
      );
      await ctx.createIndex(MANUAL_TOPUPS_COLLECTION, { clientOrgId: 1, createdAt: -1 }, { name: 'client' });
      await ctx.createIndex(MANUAL_TOPUPS_COLLECTION, { status: 1, createdAt: 1 }, { name: 'status_age' });
    },
  },
];
