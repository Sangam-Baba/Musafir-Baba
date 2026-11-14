// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  userCreated: 'identity.user.created',
  userLocked: 'identity.user.locked',
  sessionCreated: 'identity.session.created',
  sessionRevoked: 'identity.session.revoked',
  refreshReused: 'identity.session.reused',
  viewAsStarted: 'identity.view-as.started',
  viewAsEnded: 'identity.view-as.ended',
});
