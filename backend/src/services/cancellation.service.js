// Cancellation rules for MBGo app bookings (pure; tested in
// tests/cancellation.service.test.js).
//  Cabs   : cancel any time before the trip starts (instant).
//  Tours  : unpaid -> instant; paid -> request, team decides.
//  Visa   : unpaid -> instant; paid -> request, team decides.
// Refund amounts are never shown to riders; admin processes refunds.

export const CAB_CANCELLABLE = ["PAYMENT_PENDING", "PAID", "AWAITING_ASSIGNMENT", "ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED"];
const VISA_CLOSED = ["Approved", "Rejected", "Cancelled"];
const no = (message) => ({ allowed: false, message });

/** @returns {{ allowed: boolean, type?: "INSTANT"|"REQUEST", paidAmount?: number, message?: string }} */
export function getCancellationPolicy(service, booking, now = Date.now()) {
  if (!booking) return no("Booking not found");

  if (service === "CAB") {
    if (booking.status === "ONGOING") return no("Your trip has already started, so it can't be cancelled. Please contact support.");
    if (!CAB_CANCELLABLE.includes(booking.status)) return no("This ride can no longer be cancelled.");
    const paid = booking.paymentInfo?.status === "Paid" ? Number(booking.totalAmount) || 0 : 0;
    return { allowed: true, type: "INSTANT", paidAmount: paid };
  }

  if (service === "TOUR") {
    if (booking.bookingStatus === "Cancelled") return no("This booking is already cancelled.");
    if (booking.cancellation?.status === "REQUESTED") return no("A cancellation request is already under review.");
    const start = new Date(booking.startDate).getTime();
    if (Number.isFinite(start) && start <= now) return no("This trip has already started. Please contact support.");
    const isPaid = booking.paymentInfo?.status === "Paid";
    if (!isPaid) return { allowed: true, type: "INSTANT", paidAmount: 0 };
    return { allowed: true, type: "REQUEST", paidAmount: Number(booking.payNowAmount) || 0 };
  }

  if (service === "VISA") {
    if (VISA_CLOSED.includes(booking.applicationStatus)) return no("This application can no longer be cancelled.");
    if (booking.cancellation?.status === "REQUESTED") return no("A cancellation request is already under review.");
    const isPaid = booking.paymentInfo?.status === "Paid";
    if (!isPaid) return { allowed: true, type: "INSTANT", paidAmount: 0 };
    return { allowed: true, type: "REQUEST", paidAmount: Number(booking.totalAmount) || 0 };
  }

  return no("Invalid service");
}

export const cancellationCode = (n) => `MBGC${String(n).padStart(6, "0")}`;
