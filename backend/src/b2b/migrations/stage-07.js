// @ts-check
/** Migrations of Stage 07 (payments & ledger core). Run after 0001–0042; ids never renamed or reused. */
import { INTENTS_COLLECTION, PAYMENT_INBOX_COLLECTION, RECON_EXCEPTIONS_COLLECTION } from '../modules/payments/index.js';
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
  {
    id: '0046-pay-intents',
    description: 'Payment intents: one per PayU transaction id; open ones for the poller; by reference; relay index',
    up: async (ctx) => {
      await ctx.createCollection(INTENTS_COLLECTION);
      await ctx.createIndex(INTENTS_COLLECTION, { txnId: 1 }, { name: 'txn_unique', unique: true });
      await ctx.createIndex(INTENTS_COLLECTION, { status: 1, lastVerifiedAt: 1 }, { name: 'open' });
      await ctx.createIndex(INTENTS_COLLECTION, { 'reference.type': 1, 'reference.id': 1 }, { name: 'reference' });
      await ctx.createIndex(INTENTS_COLLECTION, { createdAt: -1 }, { name: 'recent' });
      await ctx.createIndex(
        INTENTS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0047-pay-inbox-and-exceptions',
    description: 'PayU messages: one per transaction id and status; reconciliation exceptions: one per kind and key, open ones first',
    up: async (ctx) => {
      await ctx.createCollection(PAYMENT_INBOX_COLLECTION);
      await ctx.createIndex(PAYMENT_INBOX_COLLECTION, { dedupeKey: 1 }, { name: 'dedupe_unique', unique: true });
      await ctx.createIndex(PAYMENT_INBOX_COLLECTION, { txnId: 1 }, { name: 'txn' });
      await ctx.createCollection(RECON_EXCEPTIONS_COLLECTION);
      await ctx.createIndex(RECON_EXCEPTIONS_COLLECTION, { kind: 1, key: 1 }, { name: 'kind_key_unique', unique: true });
      await ctx.createIndex(RECON_EXCEPTIONS_COLLECTION, { status: 1, raisedAt: -1 }, { name: 'open' });
    },
  },
];
