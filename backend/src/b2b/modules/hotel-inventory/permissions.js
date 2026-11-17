// @ts-check
/**
 * Permissions of the hotel-inventory module (rooms, prices and rules per night — Stage 04).
 * Hotel side: Owner (everything) and Manager (`hotel-inventory.**`, limited to the properties assigned to them);
 * Front Desk has no calendar access. MusafirBaba side: `**.read` roles (Hotels team, Operations, Support) look
 * at any calendar; overriding a hotel's calendar (with a reason, audited) is for Super Admin.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Hotel rooms & rates', {
  calendarRead: {
    code: 'hotel-inventory.calendar.read',
    description: 'See rate plans, cancellation policies and the calendar (rooms, prices, restrictions)',
    orgTypes: ['HOTEL'],
  },
  calendarManage: {
    code: 'hotel-inventory.calendar.manage',
    description: 'Change rate plans, cancellation policies, rooms, prices and restrictions; import a calendar file',
    orgTypes: ['HOTEL'],
  },
  adminRead: {
    code: 'hotel-inventory.admin.read',
    description: "MusafirBaba admin: see any property's rate plans and calendar",
    orgTypes: ['PLATFORM'],
  },
  adminOverride: {
    code: 'hotel-inventory.admin.override',
    description: "MusafirBaba admin: change a property's calendar on the hotel's behalf (reason required, audited)",
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
});
