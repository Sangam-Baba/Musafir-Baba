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
  VIEWS as HOTEL_INBOX_VIEWS,
  bookingInvariants,
  ACK_STEPS,
} from './hotel-bookings.service.js';
export {
  DEFAULT_CHECK_IN_TIME,
  checkInAt,
  deadlines,
  penaltyNow,
  nightAmounts,
  cancellationCharge,
  splitCharge,
  cancellationReversal,
} from './domain/cancellation-charge.js';
export { CANCELLATIONS_COLLECTION, CancellationRecord } from './models/cancellation.model.js';
export {
  createCustomerBookings,
  termsOf,
  bookingByRef,
  signQuote,
  readQuote,
  BUFFER_HOURS,
  QUOTE_MINUTES,
} from './cancellation.service.js';
export {
  AMENDMENTS_COLLECTION,
  AMENDMENT_TYPES,
  AMENDMENT_STATUSES,
  FIRST_RESPONSE_HOURS,
  AmendmentRecord,
} from './models/amendment.model.js';
export { createAmendments, buyerAmendment, adminAmendment } from './amendments.service.js';
export { NO_SHOWS_COLLECTION, NO_SHOW_STATUSES, DISPUTE_HOURS, NoShowRecord } from './models/no-show.model.js';
export { createNoShows, noShowDto } from './no-show.service.js';
export { chargeFor, noShowWindow } from './domain/cancellation-charge.js';
export { HOTEL_FAILURES_COLLECTION, HOTEL_FAILURE_STATUSES, HotelFailureRecord } from './models/hotel-failure.model.js';
export { createHotelFailures, failureDto } from './hotel-failure.service.js';
export { completeStays, payableState } from './completion.js';
