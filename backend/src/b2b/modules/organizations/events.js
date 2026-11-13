// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  orgCreated: 'organizations.org.created',
  orgStatusChanged: 'organizations.org.statusChanged',
  memberInvited: 'organizations.member.invited',
  memberJoined: 'organizations.member.joined',
  memberRemoved: 'organizations.member.removed',
});
