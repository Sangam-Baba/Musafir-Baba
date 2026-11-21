// @ts-check
/**
 * Permissions of the documents module. Buyers read their order's documents through the order (no permission);
 * MusafirBaba Finance (`documents.**`) sees every document and regenerates one (a new version, never an overwrite).
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Documents', {
  adminRead: {
    code: 'documents.admin.read',
    description: 'MusafirBaba admin: see vouchers, invoices and receipts of any order',
    orgTypes: ['PLATFORM'],
  },
  adminRegenerate: {
    code: 'documents.admin.regenerate',
    description: 'MusafirBaba admin: issue a document again (a new version; invoice numbers never change)',
    orgTypes: ['PLATFORM'],
  },
});
