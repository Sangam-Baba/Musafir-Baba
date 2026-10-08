// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeVisaFee,
  getRequiredDocuments,
  normalizeTravellers,
  validateContact,
  normalizeDocuments,
  getMissingDocuments,
  normalizeEligibility,
} from "../src/services/visaAppPricing.service.js";

const VISA = {
  cost: 4999,
  necessaryDocuments: ["Bank Statement", "Photo", "Flight Tickets"],
  visas: [
    {
      _id: "card1",
      governmentFee: 3000,
      serviceCharges: 1000,
      gst: 18,
      isExpress: true,
      expressGovernmentFee: 3500,
      expressServiceCharges: 2000,
      validityEntries: [
        { governmentFee: 2500, serviceCharges: 999, gst: 18, expressGovernmentFee: 2800, expressServiceCharges: 1999 },
        { governmentFee: 6000, serviceCharges: 1500, gst: 18 },
      ],
    },
    { _id: "card2", governmentFee: 1200, serviceCharges: 500, gst: 18, isExpress: false, expressGovernmentFee: 9999, expressServiceCharges: 9999 },
  ],
};

test("validity entry fees: gov + service + round(service × gst%), × travellers", () => {
  const f = computeVisaFee(VISA, { selectedVisaId: "card1", selectedValidityIndex: 0, isExpress: false, travellerCount: 2 });
  // 999 × 18% = 179.82 → 180; per person = 2500 + 999 + 180 = 3679
  assert.deepEqual(f.perPerson, { governmentFee: 2500, serviceCharge: 999, gstPercent: 18, gst: 180, total: 3679 });
  assert.equal(f.totalCost, 7358);
  assert.equal(f.isExpress, false);
});

test("express uses the express fees of the chosen validity", () => {
  const f = computeVisaFee(VISA, { selectedVisaId: "card1", selectedValidityIndex: 0, isExpress: true, travellerCount: 1 });
  // 1999 × 18% = 359.82 → 360; 2800 + 1999 + 360 = 5159
  assert.equal(f.totalCost, 5159);
  assert.equal(f.isExpress, true);
});

test("express is ignored when the visa type doesn't offer it", () => {
  const f = computeVisaFee(VISA, { selectedVisaId: "card2", isExpress: true, travellerCount: 1 });
  // no validity entries -> the card itself: 1200 + 500 + 90 = 1790
  assert.equal(f.totalCost, 1790);
  assert.equal(f.isExpress, false);
});

test("invalid selections are rejected", () => {
  assert.ok(computeVisaFee(VISA, { travellerCount: 1 }).error, "a visa type must be chosen when types exist");
  assert.ok(computeVisaFee(VISA, { selectedVisaId: "nope", travellerCount: 1 }).error);
  assert.ok(computeVisaFee(VISA, { selectedVisaId: "card1", selectedValidityIndex: 5, travellerCount: 1 }).error);
  assert.ok(computeVisaFee(VISA, { selectedVisaId: "card1", selectedValidityIndex: 0, travellerCount: 0 }).error);
  assert.ok(computeVisaFee(VISA, { selectedVisaId: "card1", selectedValidityIndex: 0, travellerCount: 21 }).error);
});

test("visa without types falls back to visa.cost; zero cost is an error", () => {
  assert.equal(computeVisaFee({ cost: 2000, visas: [] }, { travellerCount: 3 }).totalCost, 6000);
  assert.ok(computeVisaFee({ cost: 0, visas: [] }, { travellerCount: 1 }).error);
});

test("required documents: Passport + Photo + country list, de-duplicated", () => {
  assert.deepEqual(getRequiredDocuments(VISA), ["Passport", "Photo", "Bank Statement", "Flight Tickets"]);
});

test("traveller validation", () => {
  const ok = normalizeTravellers([{ firstName: " Asha ", lastName: "Rao", dob: "1990-05-01", gender: "Female" }]);
  assert.deepEqual(ok.travellers, [{ firstName: "Asha", lastName: "Rao", dob: "1990-05-01", gender: "Female" }]);
  assert.ok(normalizeTravellers([]).error);
  assert.ok(normalizeTravellers([{ firstName: "A", lastName: "", dob: "1990-05-01", gender: "Male" }]).error);
  assert.ok(normalizeTravellers([{ firstName: "A", lastName: "B", dob: "2999-01-01", gender: "Male" }]).error);
  assert.ok(normalizeTravellers([{ firstName: "A", lastName: "B", dob: "01/05/1990", gender: "Male" }]).error);
  assert.ok(normalizeTravellers([{ firstName: "A", lastName: "B", dob: "1990-05-01", gender: "X" }]).error);
});

test("contact validation keeps the last 10 digits", () => {
  assert.deepEqual(validateContact({ email: "a@b.co", phone: "+91 98765 43210" }), { email: "a@b.co", phone: "9876543210" });
  assert.ok(validateContact({ email: "bad", phone: "9876543210" }).error);
  assert.ok(validateContact({ email: "a@b.co", phone: "12345" }).error);
});

test("documents: travellerId is the traveller position; https only", () => {
  const media = { url: "https://cdn.x/p.pdf", key: "k", format: "application/pdf", size: 100 };
  const ok = normalizeDocuments([{ name: "Passport", travellerId: 1, media }], 2);
  assert.equal(ok.documents[0].travellerId, "1");
  assert.equal(normalizeDocuments(undefined, 2).documents, undefined);
  assert.ok(normalizeDocuments([{ name: "Passport", travellerId: "2", media }], 2).error);
  assert.ok(normalizeDocuments([{ name: "Passport", travellerId: "0", media: { url: "http://x" } }], 2).error);
  assert.ok(normalizeDocuments([{ name: "", travellerId: "0", media }], 2).error);
});

test("missing documents are listed per traveller", () => {
  const media = { url: "https://cdn.x/f" };
  const docs = ["Passport", "Photo", "Bank Statement", "Flight Tickets"].map((name) => ({ name, travellerId: "0", media }));
  assert.deepEqual(getMissingDocuments(VISA, 1, docs), []);
  const missing = getMissingDocuments(VISA, 2, docs.slice(1));
  assert.deepEqual(missing[0], { traveller: 0, name: "Passport" });
  assert.equal(missing.length, 5);
});

test("eligibility answers are optional and validated", () => {
  assert.equal(normalizeEligibility(undefined).eligibility, undefined);
  const e = normalizeEligibility({ purpose: "Holiday / Tourism", travelDate: "2026-12-01", stayDuration: "7 days", travellerCount: 2 });
  assert.deepEqual(e.eligibility, { purpose: "Holiday / Tourism", travelDate: "2026-12-01", stayDuration: "7 days", travellerCount: 2 });
  assert.ok(normalizeEligibility({ purpose: "Smuggling" }).error);
  assert.ok(normalizeEligibility({ travelDate: "tomorrow" }).error);
});
