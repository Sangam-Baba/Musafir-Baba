// @ts-check
/**
 * The journal (`wal_transactions`): one balanced entry per document (atomic on its own), unique by
 * `reference.type + reference.id + purpose`. Append-only — never edited or deleted; mistakes get a correcting entry.
 * MusafirBaba's books, read through the wallet module only.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const TRANSACTIONS_COLLECTION = 'wal_transactions';

const schema = new b2bMongoose.Schema(
  {
    reference: {
      type: new b2bMongoose.Schema({ type: { type: String, required: true }, id: { type: String, required: true } }, { _id: false }),
      required: true,
    },
    purpose: { type: String, required: true },
    lines: {
      type: [
        new b2bMongoose.Schema(
          {
            accountId: { type: String, required: true },
            debitPaise: { type: Number, required: true },
            creditPaise: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    memo: { type: String, default: null, maxlength: 500 },
    createdBy: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false },
);

export const TransactionRecord = defineModel('LedgerTransaction', schema, TRANSACTIONS_COLLECTION);
