// @ts-check
/**
 * Permissions of the identity module. A user's own account (password, MFA, sessions) needs no
 * permission — only a login (`requireSignedIn`). These are for MusafirBaba admins.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Users', {
  platformUserRead: { code: 'platform.user.read', description: 'MusafirBaba admin: search business users', orgTypes: ['PLATFORM'] },
  platformUserManage: {
    code: 'platform.user.manage',
    description: 'MusafirBaba admin: unlock users, reset their MFA, end their sessions',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  viewAs: {
    code: 'admin.viewAs.read',
    description: 'MusafirBaba admin: view a client or hotel workspace as they see it (read-only, audited)',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
  viewAsWrite: {
    code: 'admin.viewAs.write',
    description: 'MusafirBaba admin: make changes while viewing as a client or hotel (needs step-up)',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
});
