// @ts-check
/** Permissions of the bus-booking module (Stage 18): B2B clients search buses (booking comes in B6). */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Bus booking', {
  search: {
    code: 'bus-booking.search.use',
    description: 'Search buses and see seat maps at B2B prices',
    orgTypes: ['CLIENT'],
  },
});
