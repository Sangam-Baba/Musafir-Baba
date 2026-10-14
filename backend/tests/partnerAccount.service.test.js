// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidMobile, isValidEmail, normalizeEmail, isApprovedStatus, getSubmissionChecklist } from "../src/services/partnerAccount.service.js";

test("mobile numbers", () => {
  for (const m of ["9876543210", "+91 98765 43210", "09876543210", "919876543210"]) assert.ok(isValidMobile(m), m);
  for (const m of ["Not Provided", "", "12345", "1234567890", "98765432101"]) assert.equal(isValidMobile(m), false, m);
});

test("emails", () => {
  assert.equal(normalizeEmail("  Driver@Gmail.COM "), "driver@gmail.com");
  assert.ok(isValidEmail("driver@gmail.com"));
  assert.equal(isValidEmail("driver@gmail"), false);
  assert.equal(isValidEmail("not an email"), false);
});

test("approved = Approved, or Active set by an admin (not just email-verified)", () => {
  assert.ok(isApprovedStatus("Approved", false));
  assert.ok(isApprovedStatus("Active", true));
  assert.equal(isApprovedStatus("Active", false), false);
  for (const s of ["Draft", "PendingVerification", "Hold", "Rejected", "Suspended", "Blacklisted"]) assert.equal(isApprovedStatus(s, true), false, s);
});

const full = {
  profile: { fullName: "Ravi Kumar", mobileNumber: "9876543210", profilePicture: "https://cdn/x.jpg", pricingConfig: { locationsList: [{ city: "New Delhi" }] } },
  address: { city: "Delhi", state: "Delhi" },
  bank: { accountNumber: "123" },
  vehicles: [{}],
  drivers: [{}],
  documents: [{ documentType: "Aadhaar", status: "Pending" }, { documentType: "PAN", status: "Approved" }],
  settings: null,
  financialEnabled: true,
};
const missing = (data) => getSubmissionChecklist(data).filter((i) => !i.done).map((i) => i.key);

test("submit checklist: complete profile passes", () => {
  assert.deepEqual(missing(full), []);
});

test("submit checklist: catches each missing item", () => {
  assert.deepEqual(missing({ ...full, profile: { ...full.profile, mobileNumber: "Not Provided" } }), ["mobile"]);
  assert.deepEqual(missing({ ...full, documents: [{ documentType: "Aadhaar", status: "Rejected" }, { documentType: "PAN", status: "Approved" }] }), ["aadhaar"]);
  assert.deepEqual(missing({ ...full, drivers: [] }), ["driver"]);
  assert.deepEqual(missing({ ...full, profile: { ...full.profile, pricingConfig: {} } }), ["serviceArea"]);
  assert.deepEqual(missing({ ...full, profile: { ...full.profile, pricingConfig: {} }, settings: { vehicleConfigs: [{ locations: [{ city: "Jaipur" }] }] } }), []);
  assert.deepEqual(missing({ ...full, bank: null, financialEnabled: false }), []);
});
