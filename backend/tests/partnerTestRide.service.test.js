// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTestRideConfig, generateTestRide, placesForCity, fillTemplate, badgeTitle, istDateTime, DEFAULT_RIDER_NAMES } from "../src/services/partnerTestRide.service.js";

const cfg = normalizeTestRideConfig(null);

test("test rides: 100+ default rider names, all unique", () => {
  assert.ok(DEFAULT_RIDER_NAMES.length >= 100);
  assert.equal(new Set(DEFAULT_RIDER_NAMES).size, DEFAULT_RIDER_NAMES.length);
});

test("test rides: TEST RIDE badge is always on the title (can't be configured away)", () => {
  assert.equal(badgeTitle("New ride available"), "Ride · New ride available");
  assert.equal(badgeTitle("Ride · New ride available"), "Ride · New ride available");
  assert.equal(badgeTitle("RIDE: Hurry"), "Ride · Hurry");
});

test("test rides: places use the admin list for the city, else templates with the city name", () => {
  const c = normalizeTestRideConfig({ cityPlaces: [{ city: "Delhi", places: ["Saket", "IGI Airport T3, New Delhi"] }] });
  assert.deepEqual(placesForCity(c, "delhi"), ["Saket, delhi", "IGI Airport T3, New Delhi"]);
  assert.ok(placesForCity(c, "Jaipur").includes("Railway Station, Jaipur"));
});

test("test rides: generated ride uses the driver's city and vehicle; outstation goes to another city", () => {
  for (let i = 0; i < 300; i++) {
    const r = generateTestRide(cfg, { city: "Jaipur", vehicleCategory: "SUV", otherCities: ["Jaipur", "Agra"] });
    assert.ok(r.pickup.includes("Jaipur"), r.pickup);
    assert.equal(r.vehicleCategory, "SUV");
    assert.ok(DEFAULT_RIDER_NAMES.includes(r.riderName));
    if (r.tripType === "OUTSTATION") {
      assert.ok(r.drop.includes("Agra"), r.drop);
      assert.ok(r.distanceKm >= 120 && r.distanceKm <= 450);
    } else {
      assert.ok(r.drop.includes("Jaipur") && r.drop !== r.pickup);
      assert.ok(r.distanceKm >= 8 && r.distanceKm <= 40);
    }
    assert.ok(r.fare >= 100 && r.fare % 10 === 0);
    assert.match(r.rideDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(r.rideTime, /^\d{1,2}:(00|15|30|45) (AM|PM)$/);
  }
});

test("test rides: no other city -> never outstation", () => {
  const c = normalizeTestRideConfig({ tripMix: { oneWay: 0, roundTrip: 0, outstation: 100 } });
  const r = generateTestRide(c, { city: "Pune", vehicleCategory: "Sedan", otherCities: ["Pune"] });
  assert.equal(r.tripType, "ONE_WAY");
});

test("test rides: templates + IST time format", () => {
  assert.equal(fillTemplate("{pickup} → {drop} • ₹{fare} ({name})", { pickup: "A", drop: "B", fare: 4850, riderName: "Priya" }), "A → B • ₹4,850 (Priya)");
  assert.deepEqual(istDateTime(new Date("2026-10-17T12:30:00Z")), { rideDate: "2026-10-17", rideTime: "6:00 PM" });
});
