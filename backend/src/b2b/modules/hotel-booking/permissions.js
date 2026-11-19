// @ts-check
/**
 * Permissions of the hotel-booking module. For now only booking requests (D37 — before online booking): B2B clients
 * send and follow them; MusafirBaba's team handles them. Online booking permissions come with Stage 08 / 12 part B.
 * Client roles: Owner (`**`), Admin and Booking Agent (`hotel-booking.**`), Accountant and Viewer (`.read`).
 * MusafirBaba: Operations (`hotel-booking.**`), Finance / Hotels team / Support read.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Hotel bookings', {
  requestCreate: {
    code: 'hotel-booking.request.create',
    description: 'Send a booking request for a customer, and cancel it while it is open',
    orgTypes: ['CLIENT'],
  },
  requestRead: {
    code: 'hotel-booking.request.read',
    description: "See the company's booking requests and their status",
    orgTypes: ['CLIENT'],
  },
  adminRead: {
    code: 'hotel-booking.admin.read',
    description: 'MusafirBaba admin: see booking requests from B2B clients',
    orgTypes: ['PLATFORM'],
  },
  adminHandle: {
    code: 'hotel-booking.admin.handle',
    description: 'MusafirBaba admin: take, confirm or decline booking requests',
    orgTypes: ['PLATFORM'],
  },
});
