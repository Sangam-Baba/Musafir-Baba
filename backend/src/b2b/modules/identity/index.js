// @ts-check
/** PUBLIC interface of the identity module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { USERS_COLLECTION } from './models/user.model.js';
export { SESSIONS_COLLECTION, SessionRecord } from './models/session.model.js';
export { createUserRepository } from './users.repository.js';
export { createSessionService } from './sessions.service.js';
export { verifyAccessToken } from './access-token.js';
export { sessionRoutes, sendTokens, REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './session-routes.js';
export { normaliseEmail, normalisePhone, parseLoginIdentifier, assertPasswordAllowed, isLocked, lockDurationMs } from './domain/user.js';
