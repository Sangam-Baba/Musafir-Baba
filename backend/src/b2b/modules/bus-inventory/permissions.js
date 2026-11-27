// @ts-check
/** Permissions of the bus-inventory module (Stage 18): trips and their seats. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Bus trips', {
  tripRead: {
    code: 'bus-inventory.trip.read',
    description: "See the company's trips and their seats",
    orgTypes: ['BUS_OPERATOR'],
  },
  seatBlock: {
    code: 'bus-inventory.seat.block',
    description: 'Block and release seats sold at the counter',
    orgTypes: ['BUS_OPERATOR'],
  },
  tripManage: {
    code: 'bus-inventory.trip.manage',
    description: 'Stop and restart online sale of a trip',
    orgTypes: ['BUS_OPERATOR'],
  },
});
