// @ts-check
/** PUBLIC interface of the identity module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { USERS_COLLECTION } from './models/user.model.js';
export { createUserRepository } from './users.repository.js';
export { normaliseEmail, normalisePhone, parseLoginIdentifier, assertPasswordAllowed, isLocked, lockDurationMs } from './domain/user.js';
