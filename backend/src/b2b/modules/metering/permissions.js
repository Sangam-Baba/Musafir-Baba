// @ts-check
/** Permissions of the metering module: a client sees its own usage; MusafirBaba sees every client's. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Usage', {
  usageRead: {
    code: 'metering.usage.read',
    description: "See the company's counted searches and bookings this month (by kind, by person, by day)",
    orgTypes: ['CLIENT'],
  },
  adminRead: {
    code: 'metering.admin.read',
    description: "MusafirBaba admin: see every client's usage (table, per client, CSV)",
    orgTypes: ['PLATFORM'],
  },
});
