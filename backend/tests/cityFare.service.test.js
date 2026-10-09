// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCityRideFare,
  computeExtraTimeCharge,
  isSameCity,
  isCityPricingTrip,
  resolveCityLabel,
  istDateTime,
  normalizeCity,
} from "../src/services/cityFare.service.js";
import { DEFAULT_CITY_RATE_CARD, DEFAULT_CITY_GROUPS } from "../src/config/defaultCityRateCard.js";
import { buildConfigUpdate, getCityEnableError } from "../src/controllers/adminRidePricing.controller.js";

const SEDAN = DEFAULT_CITY_RATE_CARD.find((v) => v.name === "Comfort Sedan");
const SETTINGS = { taxPercent: 5, commissionPercent: 15, platformCharge: { type: "FLAT", value: 20 } };

test("default city card matches the business table", () => {
  const rows = DEFAULT_CITY_RATE_CARD.map((v) => [v.name, v.basePrice, v.perKmRate, v.freeWaitingMin, v.waitingChargePerMin, v.minBillableKm]);
  assert.deepEqual(rows, [
    ["Go Hatchback", 49, 11, 15, 2, 20],
    ["Comfort Sedan", 59, 13, 15, 2, 20],
    ["XL 7-Seater", 79, 16, 15, 3, 20],
    ["SUV", 99, 20, 15, 3, 20],
    ["Premium SUV", 129, 24, 15, 4, 20],
  ]);
});

test("one way: base + ₹/km × max(km, min km), platform charge + GST", () => {
  const f = calculateCityRideFare({ rate: SEDAN, settings: SETTINGS, trip: { tripType: "ONE_WAY", routeKm: 12 } });
  // 59 + 13 × 20 = 319; + 20 platform = 339; GST 5% = 16.95 -> 17; total 356
  assert.equal(f.billableKm, 20);
  assert.equal(f.vehicleFare, 319);
  assert.equal(f.platformCharges, 20);
  assert.equal(f.taxes, 17);
  assert.equal(f.totalAmount, 356);
  assert.equal(f.commission, 48); // 15% of 319 = 47.85
  assert.equal(f.partnerPayout, 271);
  assert.equal(f.pricingMode, "CITY");
  assert.equal(f.driverAllowance, 0);
  assert.equal(f.nightAllowance, 0);
});

test("one way above the minimum uses actual km", () => {
  const f = calculateCityRideFare({ rate: SEDAN, settings: SETTINGS, trip: { tripType: "ONE_WAY", routeKm: 27.4 } });
  assert.equal(f.billableKm, 27.4);
  assert.equal(f.vehicleFare, Math.round(59 + 27.4 * 13)); // 415
});

test("round trip doubles the km before the minimum", () => {
  const f = calculateCityRideFare({ rate: SEDAN, settings: SETTINGS, trip: { tripType: "ROUND_TRIP", routeKm: 8, rideDate: "2026-10-10", returnDate: "2026-10-10" } });
  assert.equal(f.actualKm, 16);
  assert.equal(f.billableKm, 20);
  const g = calculateCityRideFare({ rate: SEDAN, settings: SETTINGS, trip: { tripType: "ROUND_TRIP", routeKm: 15, rideDate: "2026-10-10", returnDate: "2026-10-10" } });
  assert.equal(g.billableKm, 30);
  assert.equal(g.vehicleFare, 59 + 30 * 13);
});

test("percent platform charge", () => {
  const f = calculateCityRideFare({ rate: SEDAN, settings: { ...SETTINGS, platformCharge: { type: "PERCENT", value: 10 } }, trip: { tripType: "ONE_WAY", routeKm: 10 } });
  assert.equal(f.platformCharges, 32); // 10% of 319 = 31.9
});

test("only same-day round trips qualify for city pricing", () => {
  assert.equal(isCityPricingTrip({ tripType: "ONE_WAY" }), true);
  assert.equal(isCityPricingTrip({ tripType: "ROUND_TRIP", rideDate: "2026-10-10", returnDate: "2026-10-10" }), true);
  assert.equal(isCityPricingTrip({ tripType: "ROUND_TRIP", rideDate: "2026-10-10", returnDate: "2026-10-11" }), false);
  assert.equal(isCityPricingTrip({ tripType: "ROUND_TRIP", rideDate: "bad", returnDate: "bad" }), false);
});

test("city groups: New Delhi = Delhi, Gurgaon = Gurugram, unknown -> not same", () => {
  assert.equal(isSameCity("New Delhi", "Delhi", DEFAULT_CITY_GROUPS), true);
  assert.equal(isSameCity("Gurgaon", "Gurugram", DEFAULT_CITY_GROUPS), true);
  assert.equal(isSameCity("Delhi", "Gurgaon", DEFAULT_CITY_GROUPS), false);
  assert.equal(isSameCity("Jaipur", "jaipur ", DEFAULT_CITY_GROUPS), true);
  assert.equal(isSameCity(null, "Delhi", DEFAULT_CITY_GROUPS), false);
  assert.equal(isSameCity("", "", DEFAULT_CITY_GROUPS), false);
  assert.equal(resolveCityLabel("New Delhi", DEFAULT_CITY_GROUPS), "Delhi");
  assert.equal(normalizeCity(" Nēw-Delhi "), "new delhi");
});

test("extra time: late vs booked return + free minutes", () => {
  const booked = istDateTime("2026-10-10", "05:00 PM");
  const at = (h, m) => new Date(booked.getTime() + ((h - 17) * 60 + m) * 60000);
  const rule = { freeWaitingMin: 15, waitingChargePerMin: 2, taxPercent: 5, commissionPercent: 15 };
  // 5:40 PM -> 40 late - 15 free = 25 min × ₹2 = ₹50; GST ₹3 (2.5 rounds up); total ₹53
  const late = computeExtraTimeCharge({ ...rule, bookedReturnAt: booked, returnStartedAt: at(17, 40) });
  assert.deepEqual(late, { extraMinutes: 25, waitingCharge: 50, taxes: 3, totalAmount: 53, commission: 8, partnerPayout: 42 });
  // within free minutes / early -> nothing
  assert.equal(computeExtraTimeCharge({ ...rule, bookedReturnAt: booked, returnStartedAt: at(17, 15) }).totalAmount, 0);
  assert.equal(computeExtraTimeCharge({ ...rule, bookedReturnAt: booked, returnStartedAt: at(16, 0) }).totalAmount, 0);
  // partial minute counts as a minute: 15:30 late -> 16 - 15 = 1 min
  const partial = computeExtraTimeCharge({ ...rule, bookedReturnAt: booked, returnStartedAt: new Date(booked.getTime() + 15.5 * 60000) });
  assert.equal(partial.extraMinutes, 1);
  // missing data -> nothing charged
  assert.equal(computeExtraTimeCharge({ ...rule, bookedReturnAt: null, returnStartedAt: at(18, 0) }).totalAmount, 0);
});

test("booked return time is read as India time", () => {
  assert.equal(istDateTime("2026-10-10", "05:00 PM").toISOString(), "2026-10-10T11:30:00.000Z");
  assert.equal(istDateTime("2026-10-10", "12:15 AM").toISOString(), "2026-10-09T18:45:00.000Z");
  assert.equal(istDateTime("2026-10-10", "bad"), null);
});

test("admin update only accepts whitelisted city fields", () => {
  const u = buildConfigUpdate({
    cityPricing: {
      enabled: true,
      vehicleTypes: [{ name: "Comfort Sedan", basePrice: 59, perKmRate: 13, hacker: 1 }],
      cityGroups: [{ name: "Delhi", aliases: "Delhi, New Delhi ," }, { name: "  " }],
    },
  });
  assert.equal(u["cityPricing.enabled"], true);
  assert.deepEqual(u["cityPricing.vehicleTypes"], [{ name: "Comfort Sedan", basePrice: 59, perKmRate: 13 }]);
  assert.deepEqual(u["cityPricing.cityGroups"], [{ name: "Delhi", aliases: ["Delhi", "New Delhi"] }]);
  assert.equal(buildConfigUpdate({ taxPercent: 5 })["cityPricing.enabled"], undefined);
});

test("city switch needs an active city vehicle", () => {
  assert.equal(getCityEnableError({ cityPricing: { enabled: false } }), null);
  assert.ok(getCityEnableError({ cityPricing: { enabled: true, vehicleTypes: [{ isActive: false }] } }));
  assert.equal(getCityEnableError({ cityPricing: { enabled: true, vehicleTypes: [{ isActive: true }] } }), null);
});
