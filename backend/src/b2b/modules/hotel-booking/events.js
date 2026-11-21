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
  /** cancelled by the buyer (rooms back, refund on its way) — the hotel is told */
  bookingCancelled: 'hotel-booking.booking.cancelled',
  /** a buyer asked for a change — MusafirBaba's queue */
  amendmentOpened: 'hotel-booking.amendment.opened',
  /** the buyer wrote again in a change request */
  amendmentBuyerReplied: 'hotel-booking.amendment.buyer-replied',
  /** MusafirBaba answered a change request — the buyer is emailed */
  amendmentStaffReplied: 'hotel-booking.amendment.staff-replied',
  /** a change request was resolved or closed */
  amendmentClosed: 'hotel-booking.amendment.closed',
  /** the hotel marked a no-show — the buyer is told and may dispute for 72 hours */
  noShowMarked: 'hotel-booking.no-show.marked',
  /** the buyer disputes a no-show — MusafirBaba's queue */
  noShowDisputed: 'hotel-booking.no-show.disputed',
  /** a no-show is final (window over or upheld) or reversed */
  noShowResolved: 'hotel-booking.no-show.resolved',
  /** the hotel can't honour a booking — MusafirBaba's queue; the buyer is told */
  hotelFailed: 'hotel-booking.booking.hotel-failed',
  /** a hotel failure was resolved (refunded or moved) */
  hotelFailureResolved: 'hotel-booking.hotel-failure.resolved',
  /** the stay is over (check-out day passed, hotel time) — the hotel's payable becomes ready to pay */
  bookingCompleted: 'hotel-booking.booking.completed',
  /** not acknowledged after 15 minutes — the hotel is reminded */
  bookingAckReminded: 'hotel-booking.booking.ack-reminded',
  /** not acknowledged after 30 minutes — the hotel's owners are told */
  bookingAckEscalated: 'hotel-booking.booking.ack-escalated',
  /** not acknowledged after 60 minutes — MusafirBaba operations call the hotel */
  bookingAckOverdue: 'hotel-booking.booking.ack-overdue',
});
