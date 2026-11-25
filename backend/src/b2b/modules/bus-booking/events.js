// @ts-check
/** Event types of the bus-booking module. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  bookingConfirmed: 'bus-booking.booking.confirmed',
  bookingCancelled: 'bus-booking.booking.cancelled', // some or all seats (payload: seats, refund, all)
  bookingCompleted: 'bus-booking.booking.completed', // the trip ended (payable ready to pay)
});
