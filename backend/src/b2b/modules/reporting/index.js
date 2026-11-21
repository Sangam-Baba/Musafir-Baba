// @ts-check
/** Public interface of the reporting module — other modules import only from here. */
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { BOOKING_SUMMARIES_COLLECTION, PAYMENT_STATES, BookingSummaryRecord } from './models/booking-summary.model.js';
export { createBookingSummaries } from './summaries.service.js';
