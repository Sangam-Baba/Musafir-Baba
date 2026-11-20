// @ts-check
/**
 * Permissions of the pricing module (margins, GST, price tokens — Stage 05).
 * MusafirBaba side: the Hotels / Contracting team proposes margin rules and runs the simulator (`pricing.**`);
 * approving a rule or changing tax data is sensitive (wildcards never grant it — Super Admin, or a role that lists
 * the exact code), and the approver must be a different person from the one who proposed it (maker–checker).
 * Support reads (`**.read`). Client side: a B2B client's own display markup (Stage 12 screens).
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Pricing & GST', {
  rulesRead: {
    code: 'pricing.rules.read',
    description: 'MusafirBaba admin: see margin rules, tax rules and their history',
    orgTypes: ['PLATFORM'],
  },
  rulesPropose: {
    code: 'pricing.rules.propose',
    description: 'MusafirBaba admin: draft, edit and submit margin rules for approval; discard a draft',
    orgTypes: ['PLATFORM'],
  },
  rulesApprove: {
    code: 'pricing.rules.approve',
    description: "MusafirBaba admin: approve or send back another person's margin rule; retire a rule in force",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  taxManage: {
    code: 'pricing.tax.manage',
    description: 'MusafirBaba admin: propose and approve GST rates (dated; approver must be a different person)',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  simulate: {
    code: 'pricing.simulator.use',
    description: 'MusafirBaba admin: price any property for any channel, including draft rules (shows hotel rates)',
    orgTypes: ['PLATFORM'],
  },
  markupRead: {
    code: 'pricing.markup.read',
    description: "See the company's own markup for its customers (display only, never charged by MusafirBaba)",
    orgTypes: ['CLIENT'],
  },
  markupManage: {
    code: 'pricing.markup.manage',
    description: "Change the company's own markup for its customers",
    orgTypes: ['CLIENT'],
  },
});
