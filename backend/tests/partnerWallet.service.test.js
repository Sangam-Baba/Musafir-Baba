// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig, rideKm, computeTripFee, acceptBlockReason, computeCancellationCharge, availableBalance } from "../src/services/partnerWallet.service.js";

const cfg = normalizeConfig({ enabled: true });
const H = 3600000;
const now = new Date("2026-10-20T10:00:00Z");

test("defaults", () => {
  assert.equal(cfg.firstRechargeMin, 1000);
  assert.equal(cfg.minBalance, 300);
  assert.equal(cfg.feePerKm, 1);
  assert.equal(normalizeConfig(null).enabled, false);
});

test("trip km and fee", () => {
  assert.equal(rideKm({ distanceKm: 250, tripType: "ONE_WAY" }), 250);
  assert.equal(rideKm({ distanceKm: 140, tripType: "ROUND_TRIP" }), 280);
  assert.equal(computeTripFee(cfg, { distanceKm: 280 }), 280);
  assert.equal(computeTripFee(normalizeConfig({ feePerKm: 1.25 }), { distanceKm: 10.4 }), 13);
});

test("accept rules", () => {
  // One wallet: earnings already in walletBalance count; no recharge needed first.
  assert.equal(acceptBlockReason(cfg, { walletBalance: 5000 }, 100), "");
  assert.match(acceptBlockReason(cfg, {}, 100), /Low wallet balance/);
  // Pending (unreleased) earnings don't count.
  assert.match(acceptBlockReason(cfg, { walletBalance: 0, pendingWalletBalance: 5000 }, 100), /Low wallet balance/);
  const p = { walletBalance: 1000, walletReserved: 0 };
  assert.equal(acceptBlockReason(cfg, p, 250), "");
  assert.equal(acceptBlockReason(cfg, p, 700), ""); // 1000-700 = 300 left: allowed
  assert.match(acceptBlockReason(cfg, p, 701), /Low wallet balance/);
  assert.match(acceptBlockReason(cfg, { ...p, walletReserved: 600 }, 250), /Low wallet balance/);
  assert.equal(availableBalance({ walletBalance: 1000, walletReserved: 250 }), 750);
});

test("cancellation: free window", () => {
  const r = computeCancellationCharge(cfg, { isOutstation: true, km: 300, acceptedAt: new Date(now - 4 * 60000), pickupAt: new Date(+now + 2 * H), now });
  assert.equal(r.charge, 0);
});

test("cancellation: city (regular) slabs", () => {
  assert.equal(computeCancellationCharge(cfg, { isOutstation: false, km: 20, acceptedAt: new Date(now - 30 * 60000), now }).charge, 50);
  assert.equal(computeCancellationCharge(cfg, { isOutstation: false, km: 20, acceptedAt: new Date(now - 30 * H), now }).charge, 100);
});

test("cancellation: outstation slabs by time to pickup (never stacked with flat fee)", () => {
  const acc = new Date(now - 30 * H);
  assert.equal(computeCancellationCharge(cfg, { isOutstation: true, km: 300, acceptedAt: acc, pickupAt: new Date(+now + 8 * 24 * H), now }).charge, 0);
  assert.equal(computeCancellationCharge(cfg, { isOutstation: true, km: 300, acceptedAt: acc, pickupAt: new Date(+now + 3 * 24 * H), now }).charge, 150);
  assert.equal(computeCancellationCharge(cfg, { isOutstation: true, km: 300, acceptedAt: acc, pickupAt: new Date(+now + 5 * H), now }).charge, 450);
});
