// @ts-check
/** Migrations of Stage 07 (payments & ledger core). Run after 0001–0042; ids never renamed or reused. */
import { ACCOUNTS_COLLECTION, BALANCE_SNAPSHOTS_COLLECTION, TRANSACTIONS_COLLECTION } from '../modules/wallet/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_07 = [
  {
    id: '0043-wal-accounts',
    description: 'Ledger accounts: one per owner and type; by owner type',
    up: async (ctx) => {
      await ctx.createCollection(ACCOUNTS_COLLECTION);
      await ctx.createIndex(ACCOUNTS_COLLECTION, { ownerOrgId: 1, type: 1 }, { name: 'owner_type_unique', unique: true });
      await ctx.createIndex(ACCOUNTS_COLLECTION, { ownerType: 1, type: 1 }, { name: 'owner_type' });
    },
  },
  {
    id: '0044-wal-transactions',
    description: 'Journal: one entry per reference and purpose; lines by account (balances, statements); in time order',
    up: async (ctx) => {
      await ctx.createCollection(TRANSACTIONS_COLLECTION);
      await ctx.createIndex(
        TRANSACTIONS_COLLECTION,
        { 'reference.type': 1, 'reference.id': 1, purpose: 1 },
        { name: 'reference_purpose_unique', unique: true },
      );
      await ctx.createIndex(TRANSACTIONS_COLLECTION, { 'lines.accountId': 1, _id: 1 }, { name: 'account_lines' });
      await ctx.createIndex(TRANSACTIONS_COLLECTION, { at: -1 }, { name: 'recent' });
    },
  },
  {
    id: '0045-wal-balance-snapshots',
    description: 'Derived balances: one snapshot per account (plus the journal cursor)',
    up: async (ctx) => {
      await ctx.createCollection(BALANCE_SNAPSHOTS_COLLECTION);
      await ctx.createIndex(BALANCE_SNAPSHOTS_COLLECTION, { accountId: 1 }, { name: 'account_unique', unique: true });
    },
  },
];
