// @ts-check
/** Permissions of the bus-catalog module (Stage 18): an operator manages its buses and layouts; MusafirBaba reviews them. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Buses', {
  vehicleRead: {
    code: 'bus-catalog.vehicle.read',
    description: "See the company's buses, seat layouts and papers",
    orgTypes: ['BUS_OPERATOR'],
  },
  vehicleManage: {
    code: 'bus-catalog.vehicle.manage',
    description: 'Add and change buses, seat layouts and papers; send a bus for approval',
    orgTypes: ['BUS_OPERATOR'],
  },
  platformReview: {
    code: 'platform.bus.review',
    description: "MusafirBaba admin: approve operators' buses (and routes), ask for changes, suspend",
    orgTypes: ['PLATFORM'],
  },
});
