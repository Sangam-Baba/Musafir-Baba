// @ts-check
/** Permissions of the bus-booking module (Stage 18): B2B clients search and book buses; operators see their bookings and manifests. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Bus booking', {
  search: {
    code: 'bus-booking.search.use',
    description: 'Search buses and see seat maps at B2B prices',
    orgTypes: ['CLIENT'],
  },
  bookingRead: {
    code: 'bus-booking.booking.read',
    description: "See the company's bus bookings and trip manifests (passenger lists)",
    orgTypes: ['BUS_OPERATOR'],
  },
  reviewReply: {
    code: 'bus-booking.review.reply',
    description: "Reply to passengers' reviews of the company's trips",
    orgTypes: ['BUS_OPERATOR'],
  },
});
