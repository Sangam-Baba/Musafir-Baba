// @ts-check
/** Permissions of the bus-payouts module (Stage 18 B7): a bus company sees what it is owed and what was paid. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Bus payouts', {
  payableRead: {
    code: 'bus-payouts.payable.read',
    description: 'See what MusafirBaba owes the company for its bus bookings, and the payouts made',
    orgTypes: ['BUS_OPERATOR'],
  },
});
