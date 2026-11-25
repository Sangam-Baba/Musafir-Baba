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
  routeRead: {
    code: 'bus-catalog.route.read',
    description: "See the company's boarding points, routes and schedules",
    orgTypes: ['BUS_OPERATOR'],
  },
  routeManage: {
    code: 'bus-catalog.route.manage',
    description: 'Add and change boarding points, routes and schedules; send a route for approval',
    orgTypes: ['BUS_OPERATOR'],
  },
  fareManage: {
    code: 'bus-catalog.fare.manage',
    description: 'Set net fares per stop pair and seat type, and date rules (weekend / festival)',
    orgTypes: ['BUS_OPERATOR'],
  },
  platformReview: {
    code: 'platform.bus.review',
    description: "MusafirBaba admin: approve operators' buses (and routes), ask for changes, suspend",
    orgTypes: ['PLATFORM'],
  },
});
