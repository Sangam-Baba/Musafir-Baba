// @ts-check
/** Permissions of the notifications module. A user's own bell and preferences need only a login. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Notifications', {
  platformManage: {
    code: 'platform.notification.manage',
    description: 'MusafirBaba admin: email templates, delivery log and escalations',
    orgTypes: ['PLATFORM'],
  },
});
