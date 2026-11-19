// @ts-check
/** PUBLIC interface of the hotel-booking module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { REQUEST_STATUSES, requestTransition, newRequestRef } from './domain/request.js';
export { BOOKING_REQUESTS_COLLECTION, BookingRequestRecord } from './models/booking-request.model.js';
export { createBookingRequestService, requestDto } from './request.service.js';
