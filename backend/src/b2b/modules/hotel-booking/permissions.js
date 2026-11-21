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
  bookingRead: {
    code: 'hotel-booking.booking.read',
    description: 'See bookings: a hotel its properties’ guests, dates, room and requests; a client its own (Stage 12)',
    orgTypes: ['PLATFORM', 'CLIENT', 'HOTEL'],
  },
  bookingAcknowledge: {
    code: 'hotel-booking.booking.acknowledge',
    description: 'Acknowledge a new booking (stops the reminders)',
    orgTypes: ['HOTEL'],
  },
  bookingMarkNoShow: {
    code: 'hotel-booking.booking.markNoShow',
    description: "Mark a guest who didn't come as a no-show (from noon on the check-in day)",
    orgTypes: ['HOTEL'],
  },
  bookingCannotHonour: {
    code: 'hotel-booking.booking.cannotHonour',
    description: "Tell MusafirBaba the property can't host a confirmed booking (overbooked, closed)",
    orgTypes: ['HOTEL'],
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
