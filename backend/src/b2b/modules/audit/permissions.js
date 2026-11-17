// @ts-check
/** Permissions of the audit module. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Activity log', {
  eventRead: {
    code: 'audit.event.read',
    description: "See the organisation's activity log (logins, team and role changes)",
    orgTypes: ['CLIENT', 'HOTEL'],
  },
  platformRead: {
    code: 'platform.audit.read',
    description: 'MusafirBaba admin: see the activity log of every organisation',
    orgTypes: ['PLATFORM'],
  },
});
