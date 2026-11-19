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
});
