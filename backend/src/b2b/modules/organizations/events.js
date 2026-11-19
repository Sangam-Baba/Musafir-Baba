// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  orgCreated: 'organizations.org.created',
  orgActivated: 'organizations.org.activated',
  orgSuspended: 'organizations.org.suspended',
  orgReactivated: 'organizations.org.reactivated',
  orgClosed: 'organizations.org.closed',
  /** a B2B client's category changed (its B2B prices / visible hotels may change) */
  orgCategoryChanged: 'organizations.org.category-changed',
  memberInvited: 'organizations.member.invited',
  memberJoined: 'organizations.member.joined',
  memberRemoved: 'organizations.member.removed',
  memberRolesChanged: 'organizations.member.roles-changed',
});
