// @ts-check
/**
 * Accounts (`wal_accounts`): one per owner and type — MusafirBaba's own (owner `platform`), each hotel company's
 * payable, and (Stage 11) each client's wallet / receivable. Tenant field `ownerOrgId`. DERIVED accounts never carry a
 * balance here (it is worked out from the journal into `wal_balance_snapshots`); LIVE fields arrive with Stage 11.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { ACCOUNT_TYPES } from '../domain/accounts.js';

export const ACCOUNTS_COLLECTION = 'wal_accounts';

const schema = new b2bMongoose.Schema(
  {
    ownerType: { type: String, enum: ['PLATFORM', 'HOTEL', 'CLIENT'], required: true },
    ownerOrgId: { type: String, required: true },
    type: { type: String, enum: Object.keys(ACCOUNT_TYPES), required: true },
    name: { type: String, required: true, maxlength: 120 },
    normal: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    balanceMode: { type: String, enum: ['DERIVED', 'LIVE'], required: true },
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
    openedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const AccountRecord = defineTenantModel('LedgerAccount', schema, ACCOUNTS_COLLECTION, ['ownerOrgId']);
