// Run with: node --test tests/   (DB calls are stubbed -- never connects)
import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { RidePricingConfig } from "../src/models/RidePricingConfig.js";
import { DEFAULT_RIDE_RATE_CARD } from "../src/config/defaultRideRateCard.js";
import {
  buildConfigUpdate,
  getEnableError,
  getRidePricingConfig,
  updateRidePricingConfig,
  previewRideFare,
} from "../src/controllers/adminRidePricing.controller.js";

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// findOne(...) is used both awaited directly and via .lean().
function stubFindOne(result) {
  mock.method(RidePricingConfig, "findOne", () => {
    const promise = Promise.resolve(result);
    promise.lean = () => Promise.resolve(result ? result.toObject?.() ?? result : null);
    return promise;
  });
}

afterEach(() => mock.restoreAll());

// ---- buildConfigUpdate ----

test("whitelists editable fields and drops anything else", () => {
  const update = buildConfigUpdate({
    enabled: true,
    key: "hacked",
    createdAt: "2020-01-01",
    taxPercent: 5,
    nightAllowance: { amount: 250, startHour: 22, evil: 1 },
    platformCharge: { type: "PERCENT", value: 2, extra: "x" },
    vehicleTypes: [{ _id: "abc", name: "Sedan", oneWayRate: 14, injected: true }],
  });
  assert.equal(update.key, undefined);
  assert.equal(update.createdAt, undefined);
  assert.equal(update.enabled, true);
  assert.equal(update.taxPercent, 5);
  assert.deepEqual(update.nightAllowance, { amount: 250, startHour: 22 });
  assert.deepEqual(update.platformCharge, { type: "PERCENT", value: 2 });
  assert.deepEqual(update.vehicleTypes, [{ _id: "abc", name: "Sedan", oneWayRate: 14 }]);
});

test("enabled only becomes true for a real boolean true", () => {
  assert.equal(buildConfigUpdate({ enabled: "true" }).enabled, false);
  assert.equal(buildConfigUpdate({ enabled: 1 }).enabled, false);
  assert.equal(buildConfigUpdate({}).enabled, undefined);
});

test("rejects a non-list vehicleTypes", () => {
  assert.throws(() => buildConfigUpdate({ vehicleTypes: "Sedan" }), /must be a list/);
});

test("cannot enable pricing without an active vehicle type", () => {
  assert.match(getEnableError({ enabled: true, vehicleTypes: [{ isActive: false }] }), /at least one active/);
  assert.equal(getEnableError({ enabled: true, vehicleTypes: [{ isActive: true }] }), null);
  assert.equal(getEnableError({ enabled: false, vehicleTypes: [] }), null);
});

// ---- GET ----

test("GET returns unsaved defaults (switch OFF) when nothing is saved yet", async () => {
  stubFindOne(null);
  const res = mockRes();
  await getRidePricingConfig({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.isSaved, false);
  assert.equal(res.body.data.enabled, false);
  assert.equal(res.body.data.vehicleTypes.length, DEFAULT_RIDE_RATE_CARD.length);
});

test("GET returns the saved config when one exists", async () => {
  const saved = { key: "default", enabled: true, vehicleTypes: [] };
  stubFindOne(saved);
  const res = mockRes();
  await getRidePricingConfig({}, res);
  assert.equal(res.body.isSaved, true);
  assert.equal(res.body.data.enabled, true);
});

// ---- PUT ----

test("PUT creates the config on first save and keeps the switch OFF unless asked", async () => {
  stubFindOne(null);
  const saveMock = mock.method(RidePricingConfig.prototype, "save", async function () {
    return this;
  });
  const res = mockRes();
  await updateRidePricingConfig({ body: { taxPercent: 5 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(saveMock.mock.callCount(), 1);
  assert.equal(res.body.data.enabled, false);
  assert.equal(res.body.data.taxPercent, 5);
});

test("PUT rejects invalid values with a 400 and never saves", async () => {
  stubFindOne(null);
  const saveMock = mock.method(RidePricingConfig.prototype, "save", async function () {
    await this.validate();
    return this;
  });
  const res = mockRes();
  await updateRidePricingConfig({ body: { taxPercent: 150 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(saveMock.mock.callCount(), 1); // validate() inside save threw
});

test("PUT refuses to enable pricing with every vehicle inactive", async () => {
  stubFindOne(null);
  const saveMock = mock.method(RidePricingConfig.prototype, "save", async function () {
    return this;
  });
  const res = mockRes();
  await updateRidePricingConfig(
    { body: { enabled: true, vehicleTypes: DEFAULT_RIDE_RATE_CARD.map((v) => ({ ...v, isActive: false })) } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(saveMock.mock.callCount(), 0);
});

// ---- Preview ----

test("preview prices every vehicle type from an unsaved draft without touching the DB", async () => {
  const findOneMock = mock.method(RidePricingConfig, "findOne", () => {
    throw new Error("should not query the DB for a draft preview");
  });
  const res = mockRes();
  await previewRideFare(
    {
      body: {
        trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-10", rideTime: "08:00 AM", returnDate: "2026-10-12" },
        config: { vehicleTypes: DEFAULT_RIDE_RATE_CARD, taxPercent: 5 },
      },
    },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(findOneMock.mock.callCount(), 0);
  const sedan = res.body.data.find((f) => f.name === "Sedan");
  assert.equal(sedan.vehicleFare, 10125);
  assert.equal(sedan.taxes, Math.round(10125 * 0.05));
  assert.equal(res.body.data.length, DEFAULT_RIDE_RATE_CARD.length);
});

test("preview returns 400 for an invalid trip (return before ride date)", async () => {
  const res = mockRes();
  await previewRideFare(
    {
      body: {
        trip: { tripType: "ROUND_TRIP", routeKm: 280, rideDate: "2026-10-12", returnDate: "2026-10-10" },
        config: { vehicleTypes: DEFAULT_RIDE_RATE_CARD },
      },
    },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cannot be before/);
});
