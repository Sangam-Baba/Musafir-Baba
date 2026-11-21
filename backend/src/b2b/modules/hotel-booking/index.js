// @ts-check
/** PUBLIC interface of the hotel-booking module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { REQUEST_STATUSES, requestTransition, newRequestRef } from './domain/request.js';
export { BOOKING_REQUESTS_COLLECTION, BookingRequestRecord } from './models/booking-request.model.js';
export { createBookingRequestService, requestDto } from './request.service.js';
export { BOOKING_STATUSES, BOOKING_TRANSITIONS, assertBookingTransition, holdLinesOf, confirmationCredits } from './domain/booking.js';
export { BOOKINGS_COLLECTION, BookingRecord } from './models/booking.model.js';
export { STATUS_HISTORY_COLLECTION, BookingStatusRecord } from './models/status-history.model.js';
export { createHotelItemHandler, tokenFingerprint, bookingView } from './booking.service.js';
export {
  createHotelBookingsService,
  ackEscalation,
  hotelView,
  overdueAcknowledgements,
  bookingInvariants,
  ACK_STEPS,
} from './hotel-bookings.service.js';
