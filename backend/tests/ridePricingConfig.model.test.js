// Run with: node --test tests/   (validation only -- never connects to a DB)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RidePricingConfig,
  PARTNER_VEHICLE_CATEGORIES,
} from "../src/models/RidePricingConfig.js";
import { DEFAULT_RIDE_RATE_CARD } from "../src/config/defaultRideRateCard.js";
import { calculateRideFare } from "../src/services/rideFare.service.js";

const buildConfig = (overrides = {}) =>
  new RidePricingConfig({ vehicleTypes: DEFAULT_RIDE_RATE_CARD, ...overrides });

test("default rate card is valid and the master switch defaults to OFF", () => {
  const config = buildConfig();
  assert.equal(config.validateSync(), undefined);
  assert.equal(config.enabled, false);
  assert.equal(config.key, "default");
  assert.equal(config.vehicleTypes.length, 10);
});

test("admin-filled settings default to 0 except commission (15%, same as today)", () => {
  const config = buildConfig();
  assert.equal(config.driverAllowancePerDay, 0);
  assert.equal(config.taxPercent, 0);
  assert.equal(config.platformCharge.type, "FLAT");
  assert.equal(config.platformCharge.value, 0);
  assert.equal(config.nightAllowance.amount, 0);
  assert.equal(config.nightAllowance.startHour, 22);
  assert.equal(config.nightAllowance.endHour, 6);
  assert.equal(config.nightAllowance.chargeOneWayIfPickupInWindow, true);
  assert.equal(config.nightAllowance.chargeRoundTripPerNight, true);
  assert.equal(config.commissionPercent, 15);
});

test("every rate-card type maps to a category partners can actually register", () => {
  for (const vehicle of DEFAULT_RIDE_RATE_CARD) {
    assert.ok(PARTNER_VEHICLE_CATEGORIES.includes(vehicle.partnerCategory), vehicle.name);
  }
});

test("rate card matches the pricing sheet", () => {
  const byName = Object.fromEntries(DEFAULT_RIDE_RATE_CARD.map((v) => [v.name, v]));
  assert.deepEqual(
    [byName["Sedan"].oneWayRate, byName["Sedan"].roundTripRate, byName["Sedan"].minKmPerDay],
    [14, 13.5, 250]
  );
  assert.deepEqual(
    [byName["Tempo Traveller 26 Seater"].oneWayRate, byName["Tempo Traveller 26 Seater"].roundTripRate],
    [42, 40]
  );
  assert.equal(byName["Rumion / Ertiga"].partnerCategory, "SUV");
  assert.equal(byName["Tempo Traveller 20 Seater"].partnerCategory, "Tempo Traveller");
});

test("rejects a partner category that dispatch can't match", () => {
  const config = buildConfig({
    vehicleTypes: [{ ...DEFAULT_RIDE_RATE_CARD[0], partnerCategory: "Bus" }],
  });
  assert.ok(config.validateSync()?.errors["vehicleTypes.0.partnerCategory"]);
});

test("rejects duplicate vehicle type names (case-insensitive)", () => {
  const config = buildConfig({
    vehicleTypes: [DEFAULT_RIDE_RATE_CARD[0], { ...DEFAULT_RIDE_RATE_CARD[1], name: "hatchback" }],
  });
  assert.ok(config.validateSync()?.errors.vehicleTypes);
});

test("rejects negative rates and out-of-range percents/hours", () => {
  const config = buildConfig({
    vehicleTypes: [{ ...DEFAULT_RIDE_RATE_CARD[0], oneWayRate: -1 }],
    taxPercent: 150,
    nightAllowance: { startHour: 24 },
  });
  const errors = config.validateSync()?.errors || {};
  assert.ok(errors["vehicleTypes.0.oneWayRate"]);
  assert.ok(errors.taxPercent);
  assert.ok(errors["nightAllowance.startHour"]);
});

test("a seeded config plugs straight into the fare calculator", () => {
  const config = buildConfig().toObject();
  const sedan = config.vehicleTypes.find((v) => v.name === "Sedan");
  const fare = calculateRideFare({
    rate: sedan,
    settings: config,
    trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-12" },
  });
  assert.equal(fare.vehicleFare, 10125);
  assert.equal(fare.totalAmount, 10125); // all admin charges still 0
  assert.equal(fare.commission, Math.round(10125 * 0.15));
});
