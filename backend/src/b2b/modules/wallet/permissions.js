// @ts-check
/**
 * Permissions of the wallet module (ledger core — Stage 07; client wallets and credit come with Stage 11).
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
});
