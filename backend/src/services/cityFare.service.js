// Same-city ("City rides") fare calculator + round-trip extra-time charge.
//
// Pure functions only (no DB) -- tested in tests/cityFare.service.test.js.
// Used by ride.controller.js only while admin pricing AND city pricing are
// both switched on and pickup/drop resolve to the same city group; every
// other ride keeps the outstation rate card (rideFare.service.js).
//
// ONE WAY     billableKm = MAX(routeKm, minBillableKm)
// ROUND TRIP  billableKm = MAX(routeKm × 2, minBillableKm)   (same-day return only)
//             vehicleFare = basePrice + billableKm × perKmRate
// TOTAL       vehicleFare + platformCharges + taxes
// PARTNER     vehicleFare − commission% of vehicleFare
//
// EXTRA TIME (city round trips)
//   extraMinutes = MAX(0, minutes(returnStarted − bookedReturn) − freeWaitingMin)
//   charge = extraMinutes × waitingChargePerMin, + taxes on it

import { PRICING_VERSION, parseTimeToMinutes } from "./rideFare.service.js";

export const CITY_PRICING_MODE = "CITY";
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// "New Delhi " / "new-delhi" / "Nēw Delhi" -> "new delhi"
export function normalizeCity(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Group key a place name belongs to (an admin city group, or the name itself).
export function resolveCityKey(name, cityGroups = []) {
  const n = normalizeCity(name);
  if (!n) return "";
  for (const group of cityGroups || []) {
    const names = [group?.name, ...((group && group.aliases) || [])].map(normalizeCity).filter(Boolean);
    if (names.includes(n)) return `group:${normalizeCity(group.name)}`;
  }
  return `city:${n}`;
}

// Display name for the city (group name when grouped).
export function resolveCityLabel(name, cityGroups = []) {
  const n = normalizeCity(name);
  for (const group of cityGroups || []) {
    const names = [group?.name, ...((group && group.aliases) || [])].map(normalizeCity).filter(Boolean);
    if (names.includes(n)) return group.name;
  }
  return String(name || "").trim();
}

// Both places known and in the same city (group). Unknown -> false (outstation pricing).
export function isSameCity(pickupCity, dropCity, cityGroups = []) {
  const a = resolveCityKey(pickupCity, cityGroups);
  const b = resolveCityKey(dropCity, cityGroups);
  return !!a && !!b && a === b;
}

// A trip can use city pricing when it's one-way, or a round trip returning the same day.
export function isCityPricingTrip(trip = {}) {
  if (trip.tripType !== "ROUND_TRIP") return true;
  const d = String(trip.rideDate || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && String(trip.returnDate || "").trim() === d;
}

/**
 * Same output shape as calculateRideFare (so offers/bookings/earnings code
 * can treat both alike), plus pricingMode "CITY" and basePrice.
 */
export function calculateCityRideFare({ rate = {}, settings = {}, trip = {} }) {
  const isRoundTrip = trip.tripType === "ROUND_TRIP";
  const routeKm = num(trip.routeKm);
  const actualKm = isRoundTrip ? Math.round(routeKm * 2 * 10) / 10 : routeKm;
  const billableKm = Math.max(actualKm, num(rate.minBillableKm));
  const basePrice = Math.round(num(rate.basePrice));
  const ratePerKm = num(rate.perKmRate);

  const vehicleFare = Math.round(basePrice + billableKm * ratePerKm);

  const platform = settings.platformCharge || {};
  const platformCharges =
    platform.type === "PERCENT" ? Math.round((vehicleFare * num(platform.value)) / 100) : Math.round(num(platform.value));

  const taxableAmount = vehicleFare + platformCharges;
  const taxes = Math.round((taxableAmount * num(settings.taxPercent)) / 100);
  const totalAmount = taxableAmount + taxes;

  const commission = Math.round((vehicleFare * num(settings.commissionPercent)) / 100);
  const partnerPayout = vehicleFare - commission;

  return {
    pricingVersion: PRICING_VERSION,
    pricingMode: CITY_PRICING_MODE,
    tripType: isRoundTrip ? "ROUND_TRIP" : "ONE_WAY",
    routeKm,
    actualKm,
    billableKm,
    days: 1,
    nights: 0,
    basePrice,
    ratePerKm,
    vehicleFare,
    driverAllowance: 0,
    nightAllowance: 0,
    platformCharges,
    taxes,
    totalAmount,
    commission,
    partnerPayout,
  };
}

// "2026-10-09" + "05:00 PM" (India time) -> Date, or null if malformed.
export function istDateTime(dateStr, timeStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
  const minutes = parseTimeToMinutes(timeStr);
  if (!m || minutes === null) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, minutes) - IST_OFFSET_MS);
}

/**
 * Extra-time charge for a city round trip.
 * @param {{ bookedReturnAt: Date, returnStartedAt: Date, freeWaitingMin, waitingChargePerMin, taxPercent, commissionPercent }} p
 */
export function computeExtraTimeCharge({ bookedReturnAt, returnStartedAt, freeWaitingMin, waitingChargePerMin, taxPercent, commissionPercent }) {
  const booked = bookedReturnAt instanceof Date ? bookedReturnAt.getTime() : NaN;
  const started = returnStartedAt instanceof Date ? returnStartedAt.getTime() : NaN;
  let extraMinutes = 0;
  if (Number.isFinite(booked) && Number.isFinite(started)) {
    const lateMinutes = Math.ceil((started - booked) / 60000);
    extraMinutes = Math.max(0, lateMinutes - num(freeWaitingMin));
  }
  const waitingCharge = Math.round(extraMinutes * num(waitingChargePerMin));
  const taxes = Math.round((waitingCharge * num(taxPercent)) / 100);
  const commission = Math.round((waitingCharge * num(commissionPercent)) / 100);
  return {
    extraMinutes,
    waitingCharge,
    taxes,
    totalAmount: waitingCharge + taxes,
    commission,
    partnerPayout: waitingCharge - commission,
  };
}
