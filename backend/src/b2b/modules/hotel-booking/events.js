// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** a B2B client sent a booking request — MusafirBaba's queue */
  requestSubmitted: 'hotel-booking.request.submitted',
  /** MusafirBaba confirmed it (arranged offline) — the client is told */
  requestConfirmed: 'hotel-booking.request.confirmed',
  /** MusafirBaba declined it — the client is told why */
  requestDeclined: 'hotel-booking.request.declined',
  /** the client cancelled it while it was open */
  requestCancelled: 'hotel-booking.request.cancelled',
  /** a paid booking is confirmed (rooms booked) — the hotel is alerted */
  bookingConfirmed: 'hotel-booking.booking.confirmed',
  /** the hotel acknowledged a new booking — escalation stops */
  bookingAcknowledged: 'hotel-booking.booking.acknowledged',
  /** not acknowledged after 15 minutes — the hotel is reminded */
  bookingAckReminded: 'hotel-booking.booking.ack-reminded',
  /** not acknowledged after 30 minutes — the hotel's owners are told */
  bookingAckEscalated: 'hotel-booking.booking.ack-escalated',
  /** not acknowledged after 60 minutes — MusafirBaba operations call the hotel */
  bookingAckOverdue: 'hotel-booking.booking.ack-overdue',
});
