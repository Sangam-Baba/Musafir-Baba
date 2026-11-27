// @ts-check
/**
 * Accounts (`wal_accounts`): one per owner and type — MusafirBaba's own (owner `platform`), each hotel company's
 * payable, and (Stage 11) each client's wallet / receivable. Tenant field `ownerOrgId`. DERIVED accounts never carry a
 * balance here (it is worked out from the journal into `wal_balance_snapshots`); LIVE accounts (client wallets) keep their
 * balance here, changed only by conditional updates that record an op id (see `live.service.js`).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { ACCOUNT_TYPES } from '../domain/accounts.js';
import { LIVE_OP_TYPES } from '../domain/live.js';

export const ACCOUNTS_COLLECTION = 'wal_accounts';

const schema = new b2bMongoose.Schema(
  {
    ownerType: { type: String, enum: ['PLATFORM', 'HOTEL', 'CLIENT', 'BUS_OPERATOR'], required: true },
    ownerOrgId: { type: String, required: true },
    type: { type: String, enum: Object.keys(ACCOUNT_TYPES), required: true },
    name: { type: String, required: true, maxlength: 120 },
    normal: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    balanceMode: { type: String, enum: ['DERIVED', 'LIVE'], required: true },
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
    openedBy: { type: String, required: true },
    // LIVE accounts only (client wallets, Stage 11): the balance as it is now, money held for checkouts, the credit
    // line's limit, and the operations still being finished (op ids — an op is never applied twice)
    balancePaise: { type: Number, default: 0 },
    heldPaise: { type: Number, default: 0, min: 0 },
    creditLimitPaise: { type: Number, default: 0, min: 0 },
    creditDueDays: { type: Number, default: 0, min: 0 }, // credit used must be paid back within this many days
    creditLineId: { type: String, default: null }, // the approved credit line in force (wal_credit_lines)
    ops: {
      type: [
        new b2bMongoose.Schema(
          {
            opId: { type: String, required: true },
            type: { type: String, enum: LIVE_OP_TYPES, required: true },
            amountPaise: { type: Number, required: true },
            holdId: { type: String, default: null },
            at: { type: Date, required: true },
            journal: { type: b2bMongoose.Schema.Types.Mixed, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    doneOps: { type: [String], default: [] }, // the last finished op ids (live.service.js DONE_KEPT)
    negativeSince: { type: Date, default: null }, // credit in use since (dues are counted from here)
    lowBalanceThresholdPaise: { type: Number, default: 1_000_000, min: 0 },
    lowBalanceAlerted: { type: Boolean, default: false },
    creditOverdueAlerted: { type: Boolean, default: false },
    ...eventFields(b2bMongoose), // Stage 11: wallet alerts (top-up credited, low balance, credit overdue)
    version: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export const AccountRecord = defineTenantModel('LedgerAccount', schema, ACCOUNTS_COLLECTION, ['ownerOrgId']);
