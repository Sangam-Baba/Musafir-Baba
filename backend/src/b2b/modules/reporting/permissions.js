// @ts-check
/** Permissions of the reporting module (booking lists for staff come with the admin screens; buyers read their own). */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Reporting', {
  bookingsRead: {
    code: 'reporting.bookings.read',
    description: 'MusafirBaba admin: lists of all bookings across hotels and channels',
    orgTypes: ['PLATFORM'],
  },
  reportsRead: {
    code: 'reporting.reports.read',
    description: 'MusafirBaba admin: finance and management reports (sales, margin, payments, ageing, plan revenue) and their CSV',
    orgTypes: ['PLATFORM'],
  },
  healthRead: {
    code: 'reporting.health.read',
    description: 'MusafirBaba admin: system health — results of the safety checks (rooms, ledger, stuck orders)',
    orgTypes: ['PLATFORM'],
  },
  periodLock: {
    code: 'reporting.period.lock',
    description: 'MusafirBaba finance: lock a month after the GST return is filed (no more documents dated in it)',
    orgTypes: ['PLATFORM'],
  },
});
