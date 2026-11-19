// @ts-check
/** PUBLIC interface of the wallet module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { PLATFORM_ORG, ACCOUNT_TYPES, PLATFORM_ACCOUNT_TYPES, balanceOf } from './domain/accounts.js';
export { MAX_LINES, MAX_AMOUNT_PAISE, checkEntry, sameLines } from './domain/journal.js';
export { ACCOUNTS_COLLECTION, AccountRecord } from './models/account.model.js';
export { TRANSACTIONS_COLLECTION, TransactionRecord } from './models/transaction.model.js';
export { seedPlatformAccounts, createLedger } from './ledger.service.js';
export { BALANCE_SNAPSHOTS_COLLECTION, JOURNAL_CURSOR, BalanceSnapshotRecord } from './models/balance-snapshot.model.js';
export { ROLLUP_EVERY_MS, rollUpBalances, balancesOf, ledgerInvariants } from './balances.service.js';
