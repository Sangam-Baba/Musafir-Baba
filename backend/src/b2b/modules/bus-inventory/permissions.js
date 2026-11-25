// @ts-check
/** Permissions of the bus-inventory module (Stage 18): trips and their seats. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Bus trips', {
  tripRead: {
    code: 'bus-inventory.trip.read',
    description: "See the company's trips and their seats",
    orgTypes: ['BUS_OPERATOR'],
  },
});
