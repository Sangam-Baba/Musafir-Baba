// @ts-check
/** Permissions of the access module (roles). */
import { definePermissions } from '../../core/permissions.js';

const ALL = /** @type {const} */ (['PLATFORM', 'CLIENT', 'HOTEL']);

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Roles', {
  roleRead: { code: 'access.role.read', description: 'See roles and what each role may do', orgTypes: ALL },
  roleManage: { code: 'access.role.manage', description: 'Create, edit and delete custom roles', orgTypes: ALL },
  roleAssign: { code: 'access.role.assign', description: 'Give team members a role and limit it to branches or properties', orgTypes: ALL },
});
