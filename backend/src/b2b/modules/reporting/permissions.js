// @ts-check
/** Permissions of the reporting module (booking lists for staff come with the admin screens; buyers read their own). */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Reporting', {
  bookingsRead: {
    code: 'reporting.bookings.read',
    description: 'MusafirBaba admin: lists of all bookings across hotels and channels',
    orgTypes: ['PLATFORM'],
  },
});
