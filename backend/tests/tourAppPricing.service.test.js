// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTourBookingPrice,
  normalizeTravellers,
  getBalanceDueDate,
  resolveAddOns,
} from "../src/services/tourAppPricing.service.js";

const NOW = Date.UTC(2026, 9, 7); // 7 Oct 2026
const BATCH = { quad: 9499, triple: 10499, double: 11499, child: 7499, startDate: "2026-12-16T00:00:00.000Z" };

test("matches the website's charged total: base + 5% GST, rounded up", () => {
  const { travellers } = normalizeTravellers({ quad: 2, child: 1 });
  const p = computeTourBookingPrice({ batch: BATCH, travellers, paymentOption: "FULL", now: NOW });
  // base = 2×9499 + 1×7499 = 26497; ceil(26497 × 1.05) = ceil(27821.85) = 27822
  assert.equal(p.baseAmount, 26497);
  assert.equal(p.totalAmount, 27822);
  assert.equal(p.gstAmount, 1325);
  assert.equal(p.payNowAmount, 27822);
  assert.equal(p.balanceAmount, 0);
  assert.equal(p.balanceDueDate, null);
  assert.deepEqual(p.lines.map((l) => [l.type, l.count, l.amount]), [["quad", 2, 18998], ["child", 1, 7499]]);
});

test("advance = ceil(25% of total), balance due 15 days before start", () => {
  const { travellers } = normalizeTravellers({ double: 2 });
  const p = computeTourBookingPrice({ batch: BATCH, travellers, paymentOption: "ADVANCE", now: NOW });
  // base 22998 → total ceil(24147.9) = 24148 → advance ceil(6037) = 6037
  assert.equal(p.totalAmount, 24148);
  assert.equal(p.payNowAmount, 6037);
  assert.equal(p.balanceAmount, 24148 - 6037);
  assert.equal(p.balanceDueDate.toISOString(), "2026-12-01T00:00:00.000Z");
});

test("partial payment is offered for every departure, like the website", () => {
  const { travellers } = normalizeTravellers({ quad: 1 });
  const soon = { ...BATCH, startDate: "2026-10-15T00:00:00.000Z" };
  const p = computeTourBookingPrice({ batch: soon, travellers, paymentOption: "ADVANCE" });
  assert.equal(p.error, undefined);
  assert.equal(p.payNowAmount, Math.ceil(Math.ceil(9499 * 1.05) * 0.25));
});

test("add-ons are priced from the package and added before GST (website payment page)", () => {
  const pkgAddOns = [{ title: "Helicopter", items: [{ _id: "a1", title: "Fast", price: 2500 }, { _id: "a2", title: "Free", price: 0 }] }];
  const { addOns, error } = resolveAddOns(pkgAddOns, [{ itemId: "a1", noOfPeople: 2, price: 1 }, { itemId: "a2", noOfPeople: 1 }]);
  assert.equal(error, undefined);
  assert.deepEqual(addOns.map((a) => [a.title, a.price, a.noOfPeople, a.amount]), [["Fast", 2500, 2, 5000], ["Free", 0, 1, 0]]);
  const { travellers } = normalizeTravellers({ quad: 2 });
  const p = computeTourBookingPrice({ batch: BATCH, travellers, addOns, paymentOption: "FULL" });
  // ceil((18998 + 5000) × 1.05) = ceil(25197.9) = 25198
  assert.equal(p.addOnsAmount, 5000);
  assert.equal(p.totalAmount, 25198);
  assert.equal(p.gstAmount, 25198 - 18998 - 5000);
});

test("unknown add-on or bad people count is rejected", () => {
  const pkgAddOns = [{ title: "Trek", items: [{ _id: "t1", title: "Baltal", price: 100 }] }];
  assert.match(resolveAddOns(pkgAddOns, [{ itemId: "nope", noOfPeople: 1 }]).error, /not available/);
  assert.match(resolveAddOns(pkgAddOns, [{ itemId: "t1", noOfPeople: 0 }]).error, /Invalid number of people/);
  assert.match(resolveAddOns(pkgAddOns, "x").error, /Invalid add-ons/);
  assert.deepEqual(resolveAddOns(pkgAddOns, []).addOns, []);
});

test("rejects a room type the departure has no price for", () => {
  const { travellers } = normalizeTravellers({ triple: 1 });
  const p = computeTourBookingPrice({ batch: { ...BATCH, triple: 0 }, travellers, paymentOption: "FULL", now: NOW });
  assert.match(p.error, /triple pricing/);
});

test("traveller validation", () => {
  assert.equal(normalizeTravellers({ child: 2 }).error, undefined); // child-only is allowed, as on the website
  assert.match(normalizeTravellers({}).error, /select travellers/);
  assert.match(normalizeTravellers({ quad: 1.5 }).error, /Invalid/);
  assert.match(normalizeTravellers({ quad: -1 }).error, /Invalid/);
  assert.match(normalizeTravellers({ quad: 51 }).error, /Invalid/);
  assert.deepEqual(normalizeTravellers({ quad: "2" }).travellers, { quad: 2, triple: 0, double: 0, child: 0 });
});

test("invalid payment option and bad dates", () => {
  const { travellers } = normalizeTravellers({ quad: 1 });
  assert.match(computeTourBookingPrice({ batch: BATCH, travellers, paymentOption: "HALF", now: NOW }).error, /payment option/);
  assert.equal(getBalanceDueDate("not-a-date"), null);
});
