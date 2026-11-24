// @ts-check
/** PUBLIC interface of the api-access module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { API_KEYS_COLLECTION, ApiKeyRecord } from './models/api-key.model.js';
export { KEY_ENVS, SCOPES, SCOPE_RULES, MAX_ACTIVE_KEYS, parseKey, ipAllowed, normaliseAllowList, scopesAllowed } from './domain/keys.js';
export { createApiKeys, keyDto } from './api-keys.service.js';
