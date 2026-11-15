// @ts-check
/**
 * The notification catalogue (docs/plan/11-notifications-and-realtime.md §9) as configuration:
 * which event becomes which notification, who receives it, and whether it is critical (critical
 * categories can't be switched off). Org notifications are stored once per org and shown to members
 * whose permissions include the category's permission. Pure.
 */

/** @typedef {'ORG' | 'USER'} Audience */
/**
 * @typedef {{ audience: Audience, permission: string | null, critical: boolean, label: string,
 *   emailTo: 'OWNERS' | 'USER' | 'NONE', link: string }} Category
 */

export const CATEGORIES = Object.freeze({
  'kyc.submitted': {
    audience: 'ORG',
    permission: 'kyc.application.read',
    critical: true,
    label: 'Verification submitted',
    emailTo: 'OWNERS',
    link: '/business/verification',
  },
  'kyc.approved': {
    audience: 'ORG',
    permission: 'kyc.application.read',
    critical: true,
    label: 'Verification approved',
    emailTo: 'OWNERS',
    link: '/business/verification',
  },
  'kyc.rejected': {
    audience: 'ORG',
    permission: 'kyc.application.read',
    critical: true,
    label: 'Verification needs changes',
    emailTo: 'OWNERS',
    link: '/business/verification',
  },
  'team.role-changed': {
    audience: 'USER',
    permission: null,
    critical: false,
    label: 'Your role changed',
    emailTo: 'USER',
    link: '/business',
  },
});

/** @typedef {keyof typeof CATEGORIES} CategoryKey */

/** Event type → category. @type {Readonly<Record<string, CategoryKey>>} */
export const EVENT_CATEGORIES = Object.freeze({
  'kyc.application.submitted': 'kyc.submitted',
  'kyc.application.resubmitted': 'kyc.submitted',
  'kyc.application.approved': 'kyc.approved',
  'kyc.application.rejected': 'kyc.rejected',
  'organizations.member.roles-changed': 'team.role-changed',
});

/** Events that change an admin work queue (a `queue:changed` push to MusafirBaba staff). @type {Readonly<Record<string, string>>} */
export const ADMIN_QUEUES = Object.freeze({
  'kyc.application.submitted': 'kyc',
  'kyc.application.resubmitted': 'kyc',
  'kyc.application.assigned': 'kyc',
  'kyc.application.approved': 'kyc',
  'kyc.application.rejected': 'kyc',
});

/** @param {string} key @returns {Category | null} */
export const categoryOf = (key) => /** @type {Record<string, Category>} */ (CATEGORIES)[key] ?? null;

/**
 * The org categories a member may see, from their permissions.
 * @param {readonly string[]} permissions
 * @returns {string[]}
 */
export function visibleOrgCategories(permissions) {
  return Object.entries(CATEGORIES)
    .filter(([, c]) => c.audience === 'ORG' && (c.permission === null || permissions.includes(c.permission)))
    .map(([key]) => key);
}
