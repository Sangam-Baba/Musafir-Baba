// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReferralConfig,
  generateReferralCode,
  normalizeReferralCode,
  maskName,
  linkBlockReason,
  computeFraudFlags,
} from "../src/services/partnerReferral.service.js";

const cfg = normalizeReferralConfig({ enabled: true });

test("referral: defaults (₹100 referrer, ₹100 joining, 25 to unlock, 90 days, 10/day, OFF)", () => {
  const d = normalizeReferralConfig(null);
  assert.deepEqual(
    { enabled: d.enabled, r: d.referrerReward, j: d.joiningBonus, u: d.unlockAfter, e: d.expiryDays, l: d.dailyLimit },
    { enabled: false, r: 100, j: 100, u: 25, e: 90, l: 10 }
  );
});

test("referral: codes are MBC + 5 unambiguous chars, and normalise user input", () => {
  for (let i = 0; i < 200; i++) assert.match(generateReferralCode(), /^MBC[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
  assert.equal(normalizeReferralCode(" mbc 7k4q2 "), "MBC7K4Q2");
});

test("referral: names are masked for other drivers", () => {
  assert.equal(maskName("Ravi Kumar Sharma"), "Ravi S.");
  assert.equal(maskName("Ravi"), "Ravi");
  assert.equal(maskName(""), "MBConnect partner");
});

test("referral: link rules", () => {
  const referred = { authId: "a", profileSubmitted: false, approved: false, alreadyLinked: false };
  const referrer = { authId: "b", status: "Approved" };
  assert.equal(linkBlockReason({ cfg, referred, referrer }), "");
  assert.match(linkBlockReason({ cfg: { ...cfg, enabled: false }, referred, referrer }), /isn't active/);
  assert.match(linkBlockReason({ cfg, referred, referrer: null }), /doesn't exist/);
  assert.match(linkBlockReason({ cfg, referred, referrer: { authId: "a", status: "Active" } }), /own referral code/);
  assert.match(linkBlockReason({ cfg, referred, referrer: { authId: "b", status: "Suspended" } }), /can't be used/);
  assert.match(linkBlockReason({ cfg, referred: { ...referred, alreadyLinked: true }, referrer }), /already added/);
  assert.match(linkBlockReason({ cfg, referred: { ...referred, profileSubmitted: true }, referrer }), /before you submit/);
  assert.match(linkBlockReason({ cfg, referred: { ...referred, approved: true }, referrer }), /before you submit/);
});

test("referral: fraud signals", () => {
  const a = { mobile: "+91 98765 43210", bankAccount: "5010 0123", vehicleRegs: ["DL 1C AB 1234"], pushToken: "ExpoPushToken[x]" };
  const clean = { mobile: "9123456789", bankAccount: "999", vehicleRegs: ["HR26AB1"], pushToken: "ExpoPushToken[y]" };
  assert.deepEqual(computeFraudFlags({ referrer: a, referred: clean }), []);
  const keys = computeFraudFlags({ referrer: a, referred: { mobile: "9876543210", bankAccount: "50100123", vehicleRegs: ["dl1cab1234"], pushToken: "ExpoPushToken[x]" } }).map((f) => f.key);
  assert.deepEqual(keys, ["SAME_MOBILE", "SAME_BANK", "SAME_VEHICLE", "SAME_DEVICE"]);
  assert.deepEqual(computeFraudFlags({ todayCount: 9, dailyLimit: 10 }), []);
  assert.equal(computeFraudFlags({ todayCount: 10, dailyLimit: 10 })[0].key, "DAILY_LIMIT");
  // empty values never match each other
  assert.deepEqual(computeFraudFlags({ referrer: { mobile: "", bankAccount: "", vehicleRegs: [], pushToken: "" }, referred: { mobile: "", bankAccount: "", vehicleRegs: [], pushToken: "" } }), []);
});
