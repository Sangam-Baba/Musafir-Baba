// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  userCreated: 'identity.user.created',
  userLocked: 'identity.user.locked',
  sessionsRevoked: 'identity.session.revokedAll',
  viewAsStarted: 'identity.viewAs.started',
  viewAsEnded: 'identity.viewAs.ended',
});
