// @ts-check
/**
 * Permissions of the wallet module (ledger core — Stage 07; client wallets and credit — Stage 11: the client's Owner and
 * Accountant get them through `wallet.**`).
 * Finance reads the books and proposes adjustments (`wallet.**`); approving an adjustment is sensitive (wildcards never
 * grant it — Super Admin, or a role listing the exact code) and must be a different person. Support reads.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Ledger', {
  ledgerRead: {
    code: 'wallet.ledger.read',
    description: 'MusafirBaba admin: see accounts, balances and journal entries',
    orgTypes: ['PLATFORM'],
  },
  adjustmentPropose: {
    code: 'wallet.adjustment.propose',
    description: 'MusafirBaba admin: propose a correcting journal entry (with a reason code)',
    orgTypes: ['PLATFORM'],
  },
  adjustmentApprove: {
    code: 'wallet.adjustment.approve',
    description: "MusafirBaba admin: approve another person's correcting journal entry",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  payoutRecord: {
    code: 'wallet.payout.record',
    description: 'MusafirBaba admin: see hotel payables and record a payout made by bank transfer (a second person approves)',
    orgTypes: ['PLATFORM'],
  },
  payoutApprove: {
    code: 'wallet.payout.approve',
    description: "MusafirBaba admin: approve another person's recorded hotel payout",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  topUpCheck: {
    code: 'wallet.topup.check',
    description: "MusafirBaba admin: check a client's bank-transfer top-up against the bank statement (a second person approves)",
    orgTypes: ['PLATFORM'],
  },
  topUpApprove: {
    code: 'wallet.topup.approve',
    description: "MusafirBaba admin: approve a bank-transfer top-up checked by someone else (credits the client's wallet)",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  creditPropose: {
    code: 'wallet.credit.propose',
    description: "MusafirBaba admin: propose a client's credit limit and due days (a second person approves)",
    orgTypes: ['PLATFORM'],
  },
  creditApprove: {
    code: 'wallet.credit.approve',
    description: "MusafirBaba admin: approve another person's credit limit for a client",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  walletRead: {
    code: 'wallet.account.read',
    description: "See the company's wallet: balance, money held for checkouts, credit, top-ups",
    orgTypes: ['CLIENT'],
  },
  walletTopUp: {
    code: 'wallet.account.topup',
    description: "Add money to the company's wallet (PayU or bank transfer)",
    orgTypes: ['CLIENT'],
  },
  statementRead: {
    code: 'wallet.statement.read',
    description: 'See the statement of what MusafirBaba owes and paid (download as CSV)',
    orgTypes: ['HOTEL'],
  },
});
