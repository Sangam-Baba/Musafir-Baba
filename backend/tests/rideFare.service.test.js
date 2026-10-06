// Run with: node --test tests/   (from the backend folder; uses Node's
// built-in test runner, no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRideFare,
  countTripDays,
  isInNightWindow,
  parseTimeToMinutes,
  PRICING_VERSION,
} from "../src/services/rideFare.service.js";

const SEDAN = { oneWayRate: 14, roundTripRate: 13.5, minKmPerDay: 250 };
const TT12 = { oneWayRate: 28, roundTripRate: 27, minKmPerDay: 250 };

// Everything the admin fills in left at 0 -- isolates the vehicle fare maths.
const ZERO_SETTINGS = {
  driverAllowancePerDay: 0,
  taxPercent: 0,
  commissionPercent: 0,
  platformCharge: { type: "FLAT", value: 0 },
  nightAllowance: { amount: 0, startHour: 22, endHour: 6, chargeOneWayIfPickupInWindow: true, chargeRoundTripPerNight: true },
};

const FULL_SETTINGS = {
  driverAllowancePerDay: 300,
  taxPercent: 5,
  commissionPercent: 15,
  platformCharge: { type: "FLAT", value: 99 },
  nightAllowance: { amount: 250, startHour: 22, endHour: 6, chargeOneWayIfPickupInWindow: true, chargeRoundTripPerNight: true },
};

// ---- Worked examples from the plan (Delhi -> Jaipur ~280 km, Sedan) ----

test("one way: 280 km × ₹14 = ₹3,920", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: ZERO_SETTINGS,
    trip: { tripType: "ONE_WAY", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM" },
  });
  assert.equal(fare.pricingVersion, PRICING_VERSION);
  assert.equal(fare.days, 1);
  assert.equal(fare.billableKm, 280);
  assert.equal(fare.vehicleFare, 3920);
  assert.equal(fare.totalAmount, 3920);
});

test("round trip, 2 days: MAX(560, 500) = 560 km × ₹13.50 = ₹7,560", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: ZERO_SETTINGS,
    trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-11" },
  });
  assert.equal(fare.days, 2);
  assert.equal(fare.actualKm, 560);
  assert.equal(fare.billableKm, 560);
  assert.equal(fare.vehicleFare, 7560);
});

test("round trip, 3 days: MAX(560, 750) = 750 km × ₹13.50 = ₹10,125", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: ZERO_SETTINGS,
    trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-12" },
  });
  assert.equal(fare.days, 3);
  assert.equal(fare.billableKm, 750);
  assert.equal(fare.vehicleFare, 10125);
});

test("round trip same day: minimum 250 km applies to a short route", () => {
  const fare = calculateRideFare({
    rate: TT12,
    settings: ZERO_SETTINGS,
    trip: { tripType: "ROUND_TRIP", routeKm: 40, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-10" },
  });
  assert.equal(fare.days, 1);
  assert.equal(fare.actualKm, 80);
  assert.equal(fare.billableKm, 250);
  assert.equal(fare.vehicleFare, 6750);
});

// ---- Full total with every admin charge filled in ----

test("one way, daytime: allowance + flat platform charge + 5% tax; commission on vehicle fare only", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: FULL_SETTINGS,
    trip: { tripType: "ONE_WAY", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM" },
  });
  assert.equal(fare.vehicleFare, 3920);
  assert.equal(fare.driverAllowance, 300);
  assert.equal(fare.nightAllowance, 0);
  assert.equal(fare.platformCharges, 99);
  // 5% of (3920 + 300 + 0 + 99 = 4319) = 215.95 -> 216
  assert.equal(fare.taxes, 216);
  assert.equal(fare.totalAmount, 4535);
  // 15% of 3920 = 588; payout = 3920 - 588 + 300 + 0
  assert.equal(fare.commission, 588);
  assert.equal(fare.partnerPayout, 3632);
});

test("one way, pickup at 11:30 PM: one night allowance", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: FULL_SETTINGS,
    trip: { tripType: "ONE_WAY", routeKm: 280, rideDate: "2026-10-10", rideTime: "11:30 PM" },
  });
  assert.equal(fare.nights, 1);
  assert.equal(fare.nightAllowance, 250);
  // 5% of (3920 + 300 + 250 + 99 = 4569) = 228.45 -> 228
  assert.equal(fare.taxes, 228);
  assert.equal(fare.totalAmount, 4797);
  assert.equal(fare.partnerPayout, 3920 - 588 + 300 + 250);
});

test("round trip, 3 days: allowance × 3 days, night allowance × 2 nights", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: FULL_SETTINGS,
    trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-12" },
  });
  assert.equal(fare.vehicleFare, 10125);
  assert.equal(fare.driverAllowance, 900);
  assert.equal(fare.nights, 2);
  assert.equal(fare.nightAllowance, 500);
  // 5% of (10125 + 900 + 500 + 99 = 11624) = 581.2 -> 581
  assert.equal(fare.taxes, 581);
  assert.equal(fare.totalAmount, 12205);
});

test("platform charge as a percent of vehicle fare", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: { ...ZERO_SETTINGS, platformCharge: { type: "PERCENT", value: 2 } },
    trip: { tripType: "ONE_WAY", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM" },
  });
  // 2% of 3920 = 78.4 -> 78
  assert.equal(fare.platformCharges, 78);
  assert.equal(fare.totalAmount, 3998);
});

// ---- Night allowance toggles (admin-configurable) ----

test("night allowance: one-way toggle off -> not charged even at night", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: { ...FULL_SETTINGS, nightAllowance: { ...FULL_SETTINGS.nightAllowance, chargeOneWayIfPickupInWindow: false } },
    trip: { tripType: "ONE_WAY", routeKm: 280, rideDate: "2026-10-10", rideTime: "11:30 PM" },
  });
  assert.equal(fare.nightAllowance, 0);
});

test("night allowance: round-trip toggle off -> not charged per night", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: { ...FULL_SETTINGS, nightAllowance: { ...FULL_SETTINGS.nightAllowance, chargeRoundTripPerNight: false } },
    trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-12" },
  });
  assert.equal(fare.nightAllowance, 0);
});

test("night window wraps past midnight (22 -> 6)", () => {
  assert.equal(isInNightWindow("10:00 PM", 22, 6), true);
  assert.equal(isInNightWindow("12:00 AM", 22, 6), true);
  assert.equal(isInNightWindow("05:59 AM", 22, 6), true);
  assert.equal(isInNightWindow("06:00 AM", 22, 6), false);
  assert.equal(isInNightWindow("09:59 PM", 22, 6), false);
  assert.equal(isInNightWindow("12:00 PM", 22, 6), false);
});

test("night window that doesn't wrap (0 -> 5) and a disabled window (equal hours)", () => {
  assert.equal(isInNightWindow("02:00 AM", 0, 5), true);
  assert.equal(isInNightWindow("11:00 PM", 0, 5), false);
  assert.equal(isInNightWindow("11:00 PM", 22, 22), false);
});

// ---- Parsing / validation ----

test("time parsing: 12-hour and 24-hour formats", () => {
  assert.equal(parseTimeToMinutes("12:00 AM"), 0);
  assert.equal(parseTimeToMinutes("12:30 PM"), 750);
  assert.equal(parseTimeToMinutes("8:05pm"), 1205);
  assert.equal(parseTimeToMinutes("20:05"), 1205);
  assert.equal(parseTimeToMinutes("garbage"), null);
  assert.equal(parseTimeToMinutes(""), null);
});

test("trip days are inclusive and cross month boundaries", () => {
  assert.equal(countTripDays("2026-10-10", "2026-10-10"), 1);
  assert.equal(countTripDays("2026-10-31", "2026-11-02"), 3);
});

test("round trip with return before ride date is rejected", () => {
  assert.throws(() => countTripDays("2026-10-12", "2026-10-10"), /cannot be before/);
  assert.throws(
    () => calculateRideFare({
      rate: SEDAN,
      settings: ZERO_SETTINGS,
      trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-12", returnDate: "2026-10-10" },
    }),
    /cannot be before/
  );
});

test("round trip with missing return date is rejected", () => {
  assert.throws(() => countTripDays("2026-10-10", ""), /required/);
});

test("missing/invalid admin values are treated as 0, never NaN", () => {
  const fare = calculateRideFare({
    rate: { oneWayRate: 14 },
    settings: { taxPercent: "abc", driverAllowancePerDay: undefined },
    trip: { tripType: "ONE_WAY", routeKm: 100, rideTime: "11:30 PM" },
  });
  assert.equal(fare.vehicleFare, 1400);
  assert.equal(fare.totalAmount, 1400);
  for (const value of Object.values(fare)) {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
  }
});

// ---- Partner earnings (getRidePartnerEarning) ----

import { getRidePartnerEarning } from "../src/services/rideFare.service.js";

test("old rides (no pricingVersion) keep the original commission formula exactly", () => {
  for (const ride of [
    { totalAmount: 7461, platformCommissionPercent: 15 },
    { totalAmount: 3382, platformCommissionPercent: 15 },
    { totalAmount: 999, platformCommissionPercent: 12.5 },
    { totalAmount: 0, platformCommissionPercent: 15 },
  ]) {
    const original = Math.round((ride.totalAmount * ride.platformCommissionPercent) / 100);
    assert.deepEqual(getRidePartnerEarning(ride), {
      commission: original,
      netEarning: ride.totalAmount - original,
      platformAndTaxes: 0,
    });
  }
});

test("admin-priced rides use the commission/payout stored at booking", () => {
  const fare = calculateRideFare({
    rate: SEDAN,
    settings: FULL_SETTINGS,
    trip: { tripType: "ONE_WAY", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM" },
  });
  const ride = {
    pricingVersion: PRICING_VERSION,
    totalAmount: fare.totalAmount,
    platformCommissionPercent: 15,
    commissionAmount: fare.commission,
    partnerPayout: fare.partnerPayout,
  };
  const earning = getRidePartnerEarning(ride);
  assert.equal(earning.commission, 588);
  assert.equal(earning.netEarning, 3632);
  // platform 99 + tax 216 stay with the platform
  assert.equal(earning.platformAndTaxes, 315);
  assert.equal(earning.commission + earning.netEarning + earning.platformAndTaxes, fare.totalAmount);
});

test("a ride marked v2 but missing its stored payout falls back to the original formula", () => {
  const ride = { pricingVersion: PRICING_VERSION, totalAmount: 1000, platformCommissionPercent: 15 };
  assert.deepEqual(getRidePartnerEarning(ride), { commission: 150, netEarning: 850, platformAndTaxes: 0 });
});
