// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPlaceName, makeLocationMatcher, vehicleServesAddress, isOfferedToPartner } from "../src/services/rideDispatch.service.js";

const groups = [
  { name: "Delhi", aliases: ["Delhi", "New Delhi"] },
  { name: "Gurugram", aliases: ["Gurugram", "Gurgaon"] },
  { name: "Bengaluru", aliases: ["Bengaluru", "Bangalore"] },
];
const match = makeLocationMatcher(groups);

test("clean place names", () => {
  assert.equal(cleanPlaceName("Delhi East Division"), "delhi");
  assert.equal(cleanPlaceName("South West Delhi"), "delhi");
  assert.equal(cleanPlaceName("Mumbai Zone 3"), "mumbai");
  assert.equal(cleanPlaceName("New Delhi GPO Division"), "new delhi");
});

test("everything the old rule matched still matches", () => {
  assert.ok(match("Connaught Place, Chanakya Puri Tehsil, New Delhi, Delhi, 110001, India", "New Delhi"));
  assert.ok(match("Railway Station, Jaipur, Rajasthan", "Jaipur"));
  assert.ok(match("DLF Cyber Hub, Sector 25A, Gurgaon, Gurugram, Haryana, India", "Gurugram"));
});

test("Delhi addresses without 'New Delhi' now match a New Delhi partner", () => {
  assert.ok(match("Saket, Mehrauli Badarpur Road, Lado Sarai, Hauz Khas Tehsil, South Delhi, Delhi, 110030, India", "New Delhi"));
  assert.ok(match("Dwarka Sector 21, Kapashera Tehsil, South West Delhi, Delhi, 110077, India", "New Delhi"));
  assert.ok(match("Saket, South Delhi, Delhi, India", "Delhi East Division"));
  assert.ok(match("Koramangala, Bangalore, Karnataka", "Bengaluru"));
  assert.ok(match("Sector 14, Gurgaon, Haryana", "Gurugram"));
});

test("no false matches", () => {
  assert.equal(match("Delhi Road, Meerut, Uttar Pradesh", "New Delhi"), false);
  assert.equal(match("Saket, South Delhi, Delhi, India", "Mumbai"), false);
  assert.equal(match("Hazratganj, Lucknow, Uttar Pradesh", "New Delhi"), false);
  assert.equal(match("", "Delhi"), false);
  assert.equal(match("Delhi", ""), false);
});

test("vehicle cities = website duty locations + app service area", () => {
  const vehicle = { _id: "v1" };
  const settings = { vehicleConfigs: [{ vehicleId: "v1", locations: [{ city: "Jaipur" }] }] };
  const profile = { pricingConfig: { locationsList: [{ city: "New Delhi South West Division" }] } };
  assert.ok(vehicleServesAddress({ vehicle, settings, profile, address: "Railway Station, Jaipur, Rajasthan", match }));
  assert.ok(vehicleServesAddress({ vehicle, settings: null, profile, address: "Saket, South Delhi, Delhi, India", match }));
  assert.equal(vehicleServesAddress({ vehicle, settings: null, profile: {}, address: "Saket, South Delhi, Delhi, India", match }), false);
});

test("broadcast to selected partners", () => {
  assert.ok(isOfferedToPartner({}, "p1"));
  assert.ok(isOfferedToPartner({ broadcastPartnerIds: [] }, "p1"));
  assert.ok(isOfferedToPartner({ broadcastPartnerIds: ["p1", "p2"] }, "p2"));
  assert.equal(isOfferedToPartner({ broadcastPartnerIds: ["p1"] }, "p3"), false);
});
