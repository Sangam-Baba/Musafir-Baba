// @ts-check
/** PUBLIC interface of the access module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { PERMISSIONS_COLLECTION } from './models/permission.model.js';
export { ROLES_COLLECTION, RoleRecord } from './models/role.model.js';
export { syncPermissionCatalogue } from './permission-sync.js';
export { matchesPattern, allowedPermissions, resolvePatterns } from './domain/patterns.js';
export { SYSTEM_ROLES, systemRole, systemRolesFor, resolveSystemRole } from './domain/system-roles.js';
export { isCustomRoleRef, customRoleRef } from './domain/custom-roles.js';
export { createRolesService } from './roles.service.js';
export { roleRoutes } from './routes.js';
