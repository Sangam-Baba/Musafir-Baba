// @ts-check
/**
 * Permissions of the payments module (PayU — Stage 07). Finance sees payments and refunds and works the reconciliation
 * (`payments.**`); a manual refund and a test payment are sensitive (Super Admin, or a role listing the exact code).
 * Support reads. Customers and clients pay through orders (Stage 08) — no permission of their own here.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Payments', {
  paymentRead: {
    code: 'payments.payment.read',
    description: 'MusafirBaba admin: see payments, refunds and settlements',
    orgTypes: ['PLATFORM'],
  },
  reconManage: {
    code: 'payments.recon.manage',
    description: 'MusafirBaba admin: import settlement reports and resolve reconciliation differences',
    orgTypes: ['PLATFORM'],
  },
  refundCreate: {
    code: 'payments.refund.create',
    description: 'MusafirBaba admin: refund a payment to its source by hand',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  testRun: {
    code: 'payments.test.run',
    description: 'MusafirBaba admin: make a small test payment to check the PayU connection',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
});
