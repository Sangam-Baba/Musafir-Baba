// @ts-check
/**
 * Derived balances (`wal_balance_snapshots`): per account, the totals of its journal lines up to `asOfTransactionId`
 * (journal ids grow over time). Written only by the background roll-up — never by booking flows. A single row with
 * `accountId: '__journal-cursor__'` remembers how far the roll-up has read the journal.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const BALANCE_SNAPSHOTS_COLLECTION = 'wal_balance_snapshots';
export const JOURNAL_CURSOR = '__journal-cursor__';

const schema = new b2bMongoose.Schema(
  {
    accountId: { type: String, required: true },
    debitPaise: { type: Number, default: 0 },
    creditPaise: { type: Number, default: 0 },
    asOfTransactionId: { type: String, default: '' }, // '' = nothing read yet; ids compare in time order
    at: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false },
);

export const BalanceSnapshotRecord = defineModel('LedgerBalanceSnapshot', schema, BALANCE_SNAPSHOTS_COLLECTION);
