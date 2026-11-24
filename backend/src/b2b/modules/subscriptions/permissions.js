// @ts-check
/**
 * Permissions of the subscriptions module (plan Stage 13). MusafirBaba: Finance proposes plans, overrides and top-ups
 * (`subscriptions.**`); publishing a plan and approving an override are sensitive (exact code, a different person).
 * Clients: the Owner and Accountant see and change the company's plan.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Plans', {
  planManage: {
    code: 'subscriptions.plan.manage',
    description: 'MusafirBaba admin: draft plan versions, change what counts as a query, retire plans',
    orgTypes: ['PLATFORM'],
  },
  planPublish: {
    code: 'subscriptions.plan.publish',
    description: "MusafirBaba admin: publish or reject another person's plan version",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  subscriptionManage: {
    code: 'subscriptions.subscription.manage',
    description: "MusafirBaba admin: see clients' subscriptions, propose overrides and query top-ups",
    orgTypes: ['PLATFORM'],
  },
  overrideApprove: {
    code: 'subscriptions.override.approve',
    description: "MusafirBaba admin: approve another person's override or query top-up",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  subscriptionRead: {
    code: 'subscriptions.subscription.read',
    description: "See the company's plan, limits and invoices",
    orgTypes: ['CLIENT'],
  },
  subscriptionChange: {
    code: 'subscriptions.subscription.change',
    description: "Change or cancel the company's plan",
    orgTypes: ['CLIENT'],
  },
});
