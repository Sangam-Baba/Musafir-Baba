// Rate-card ride fare calculator (admin-managed pricing, "pricingVersion 2").
//
// Pure functions only -- no DB access, no side effects -- so the exact maths
// can be unit-tested in isolation (see tests/rideFare.service.test.js). Nothing in
// the app calls this yet; ride.controller.js keeps using its existing
// partner-rate pricing until the admin pricing switch is turned on.
//
// ONE WAY     vehicleFare = routeKm × oneWayRate                     (days = 1)
// ROUND TRIP  actualKm    = routeKm × 2
//             days        = returnDate − rideDate + 1               (inclusive)
//             billableKm  = MAX(actualKm, minKmPerDay × days)
//             vehicleFare = billableKm × roundTripRate
// TOTAL       vehicleFare + driverAllowance + nightAllowance
//             + platformCharges + taxes
// PARTNER     vehicleFare − commission% of vehicleFare
//             + driverAllowance + nightAllowance
//
// Tolls, parking, state tax, permits etc. are "payable on trip" -- shown to
// the rider as a note, never part of totalAmount.

export const PRICING_VERSION = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// "YYYY-MM-DD" -> UTC midnight timestamp, or null if malformed.
function parseDateOnly(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// "08:30 PM" / "8:30pm" / "20:30" -> minutes since midnight, or null.
export function parseTimeToMinutes(timeStr) {
  const str = String(timeStr || "").trim();
  const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(str);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const meridiem = ampm[3].toUpperCase();
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }
  const h24 = /^(\d{1,2}):(\d{2})$/.exec(str);
  if (h24) {
    const hour = Number(h24[1]);
    const minute = Number(h24[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }
  return null;
}

// Whether a time falls inside the night window. The window may wrap past
// midnight (e.g. 22 -> 6). Equal start/end hours means "no night window".
export function isInNightWindow(timeStr, startHour, endHour) {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return false;
  const start = Number(startHour) * 60;
  const end = Number(endHour) * 60;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

// Inclusive calendar days between two "YYYY-MM-DD" dates (same day = 1).
// Throws if the return date is before the ride date or either is malformed.
export function countTripDays(rideDate, returnDate) {
  const start = parseDateOnly(rideDate);
  const end = parseDateOnly(returnDate);
  if (start === null || end === null) {
    throw new Error("Valid ride and return dates are required for a round trip");
  }
  if (end < start) {
    throw new Error("Return date cannot be before the ride date");
  }
  return Math.round((end - start) / DAY_MS) + 1;
}

// Partner earning for a stored RideBooking.
// - Admin-priced rides (pricingVersion 2) use the commission + payout fixed at
//   booking time; the platform charges/taxes part of totalAmount is neither
//   commission nor partner money, so it's reported separately.
// - Every other ride keeps the original formula exactly:
//   commission = round(totalAmount × commission%), net = totalAmount − commission.
export function getRidePartnerEarning(ride) {
  const totalAmount = Number(ride.totalAmount) || 0;
  if (ride.pricingVersion === PRICING_VERSION && Number.isFinite(ride.partnerPayout)) {
    const commission = Number(ride.commissionAmount) || 0;
    const netEarning = ride.partnerPayout;
    return { commission, netEarning, platformAndTaxes: totalAmount - netEarning - commission };
  }
  const commission = Math.round((ride.totalAmount * ride.platformCommissionPercent) / 100);
  return { commission, netEarning: ride.totalAmount - commission, platformAndTaxes: 0 };
}

/**
 * @param {object} params
 * @param {{ oneWayRate: number, roundTripRate: number, minKmPerDay: number }} params.rate
 *   One vehicle type's row from the admin rate card.
 * @param {object} params.settings  Global admin pricing settings:
 *   driverAllowancePerDay, taxPercent, commissionPercent,
 *   platformCharge: { type: "FLAT" | "PERCENT", value },
 *   nightAllowance: { amount, startHour, endHour,
 *                     chargeOneWayIfPickupInWindow, chargeRoundTripPerNight }
 * @param {object} params.trip
 *   { tripType: "ONE_WAY" | "ROUND_TRIP", routeKm, rideTime, rideDate, returnDate }
 */
export function calculateRideFare({ rate = {}, settings = {}, trip = {} }) {
  const isRoundTrip = trip.tripType === "ROUND_TRIP";
  const routeKm = num(trip.routeKm);

  let days = 1;
  let actualKm = routeKm;
  let billableKm = routeKm;
  let ratePerKm = num(rate.oneWayRate);

  if (isRoundTrip) {
    days = countTripDays(trip.rideDate, trip.returnDate);
    actualKm = Math.round(routeKm * 2 * 10) / 10;
    billableKm = Math.max(actualKm, num(rate.minKmPerDay) * days);
    ratePerKm = num(rate.roundTripRate);
  }

  const vehicleFare = Math.round(billableKm * ratePerKm);
  const driverAllowance = Math.round(num(settings.driverAllowancePerDay) * days);

  const night = settings.nightAllowance || {};
  let nights = 0;
  if (isRoundTrip) {
    if (night.chargeRoundTripPerNight) nights = days - 1;
  } else if (night.chargeOneWayIfPickupInWindow && isInNightWindow(trip.rideTime, night.startHour, night.endHour)) {
    nights = 1;
  }
  const nightAllowance = Math.round(num(night.amount) * nights);

  const platform = settings.platformCharge || {};
  const platformCharges =
    platform.type === "PERCENT"
      ? Math.round((vehicleFare * num(platform.value)) / 100)
      : Math.round(num(platform.value));

  const taxableAmount = vehicleFare + driverAllowance + nightAllowance + platformCharges;
  const taxes = Math.round((taxableAmount * num(settings.taxPercent)) / 100);

  const totalAmount = taxableAmount + taxes;

  const commission = Math.round((vehicleFare * num(settings.commissionPercent)) / 100);
  const partnerPayout = vehicleFare - commission + driverAllowance + nightAllowance;

  return {
    pricingVersion: PRICING_VERSION,
    tripType: isRoundTrip ? "ROUND_TRIP" : "ONE_WAY",
    routeKm,
    actualKm,
    billableKm,
    days,
    nights,
    ratePerKm,
    vehicleFare,
    driverAllowance,
    nightAllowance,
    platformCharges,
    taxes,
    totalAmount,
    commission,
    partnerPayout,
  };
}
