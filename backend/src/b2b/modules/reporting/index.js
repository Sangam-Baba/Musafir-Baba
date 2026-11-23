// @ts-check
/** Public interface of the reporting module — other modules import only from here. */
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { BOOKING_SUMMARIES_COLLECTION, PAYMENT_STATES, BookingSummaryRecord } from './models/booking-summary.model.js';
export { createBookingSummaries, clientFilter } from './summaries.service.js';
export { ADMIN_REPORTS, rangeOf } from './admin-reports.service.js';
export { createAdminReports } from './admin-reports-money.service.js';
export { AGE_BUCKETS, SOLD_STATUSES, ageBucket, groupLines, periodOf, refundsOncePerOrder, toCsv } from './domain/reports.js';
export { CLIENT_REPORTS, createClientReports } from './client-reports.service.js';
