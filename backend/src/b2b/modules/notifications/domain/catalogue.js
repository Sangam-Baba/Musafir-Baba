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
  // Stage 10: the same approval for a B2B client — its own wording and link (hotels keep 'kyc.approved')
  'kyc.approved-client': {
    audience: 'ORG',
    permission: 'kyc.application.read',
    critical: true,
    label: 'Verification approved',
    emailTo: 'OWNERS',
    link: '/business',
  },
  'kyc.rejected': {
    audience: 'ORG',
    permission: 'kyc.application.read',
    critical: true,
    label: 'Verification needs changes',
    emailTo: 'OWNERS',
    link: '/business/verification',
  },
  'kyc.reminder': {
    audience: 'ORG',
    permission: 'kyc.application.read',
    critical: false,
    label: 'Finish your verification',
    emailTo: 'OWNERS',
    link: '/business/verification',
  },
  'listing.published': {
    audience: 'ORG',
    permission: 'hotel-catalog.property.read',
    critical: false,
    label: 'Listing is live',
    emailTo: 'OWNERS',
    link: '/business/properties/{propertyId}',
  },
  'listing.changes-requested': {
    audience: 'ORG',
    permission: 'hotel-catalog.property.read',
    critical: true,
    label: 'Listing needs changes',
    emailTo: 'OWNERS',
    link: '/business/properties/{propertyId}',
  },
  'listing.suspended': {
    audience: 'ORG',
    permission: 'hotel-catalog.property.read',
    critical: true,
    label: 'Listing suspended',
    emailTo: 'OWNERS',
    link: '/business/properties/{propertyId}',
  },
  'listing.revision-decided': {
    audience: 'ORG',
    permission: 'hotel-catalog.property.read',
    critical: false,
    label: 'Listing changes reviewed',
    emailTo: 'OWNERS',
    link: '/business/properties/{propertyId}',
  },
  'team.role-changed': {
    audience: 'USER',
    permission: null,
    critical: false,
    label: 'Your role changed',
    emailTo: 'USER',
    link: '/business',
  },
  // D37: booking requests from B2B clients
  'booking-request.confirmed': {
    audience: 'ORG',
    permission: 'hotel-booking.request.read',
    critical: false,
    label: 'Booking request confirmed',
    emailTo: 'OWNERS',
    link: '/business/booking-requests',
  },
  'booking-request.declined': {
    audience: 'ORG',
    permission: 'hotel-booking.request.read',
    critical: false,
    label: 'Booking request declined',
    emailTo: 'OWNERS',
    link: '/business/booking-requests',
  },
  // Stage 08: hotel booking alerts (critical — can't be switched off)
  'booking.new': {
    audience: 'ORG',
    permission: 'hotel-booking.booking.read',
    critical: true,
    label: 'New booking',
    emailTo: 'OWNERS',
    link: '/business/bookings',
  },
  'booking.reminder': {
    audience: 'ORG',
    permission: 'hotel-booking.booking.read',
    critical: true,
    label: 'Booking waiting for acknowledgement',
    emailTo: 'OWNERS',
    link: '/business/bookings',
  },
  'booking.escalated': {
    audience: 'ORG',
    permission: 'hotel-booking.booking.read',
    critical: true,
    label: 'Booking not acknowledged',
    emailTo: 'OWNERS',
    link: '/business/bookings',
  },
});

/** @typedef {keyof typeof CATEGORIES} CategoryKey */

/** Event type → category. @type {Readonly<Record<string, CategoryKey>>} */
export const EVENT_CATEGORIES = Object.freeze({
  'kyc.application.submitted': 'kyc.submitted',
  'kyc.application.resubmitted': 'kyc.submitted',
  'kyc.application.approved': 'kyc.approved',
  'kyc.application.rejected': 'kyc.rejected',
  'kyc.application.reminded': 'kyc.reminder',
  'hotel-catalog.property.published': 'listing.published',
  'hotel-catalog.property.changes-requested': 'listing.changes-requested',
  'hotel-catalog.property.suspended': 'listing.suspended',
  'hotel-catalog.revision.decided': 'listing.revision-decided',
  'organizations.member.roles-changed': 'team.role-changed',
  'hotel-booking.request.confirmed': 'booking-request.confirmed',
  'hotel-booking.request.declined': 'booking-request.declined',
  'hotel-booking.booking.confirmed': 'booking.new',
  'hotel-booking.booking.ack-reminded': 'booking.reminder',
  'hotel-booking.booking.ack-escalated': 'booking.escalated',
});

/** Events that change an admin work queue (a `queue:changed` push to MusafirBaba staff). @type {Readonly<Record<string, string>>} */
export const ADMIN_QUEUES = Object.freeze({
  'kyc.application.submitted': 'kyc',
  'kyc.application.resubmitted': 'kyc',
  'kyc.application.assigned': 'kyc',
  'kyc.application.approved': 'kyc',
  'kyc.application.rejected': 'kyc',
  'kyc.gst-registration.added': 'kyc',
  'kyc.gst-registration.decided': 'kyc',
  'hotel-catalog.property.submitted': 'listings',
  'hotel-catalog.revision.submitted': 'listings',
  'hotel-catalog.property.published': 'listings',
  'hotel-catalog.property.changes-requested': 'listings',
  'hotel-catalog.revision.decided': 'listings',
  'hotel-booking.request.submitted': 'booking-requests',
  'hotel-booking.request.cancelled': 'booking-requests',
  'hotel-booking.request.confirmed': 'booking-requests',
  'hotel-booking.request.declined': 'booking-requests',
  'hotel-booking.booking.ack-overdue': 'hotel-ack', // 60 minutes: operations call the hotel
  'hotel-booking.booking.acknowledged': 'hotel-ack',
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

/** Notifications worded differently for B2B clients (event payload `orgType: 'CLIENT'`). @type {Readonly<Record<string, string>>} */
export const CLIENT_VARIANTS = Object.freeze({ 'kyc.approved': 'kyc.approved-client' });

/**
 * The notification for an event: its category, or the client wording when the event is about a B2B client.
 * @param {string} eventType
 * @param {Record<string, unknown>} payload
 * @returns {string | undefined}
 */
export function categoryKeyFor(eventType, payload) {
  const key = EVENT_CATEGORIES[eventType];
  return key && payload.orgType === 'CLIENT' ? (CLIENT_VARIANTS[key] ?? key) : key;
}
