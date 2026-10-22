import crypto from "crypto";
import cron from "node-cron";
import RiderAuth from "../models/rider/RiderAuth.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderReferral from "../models/rider/RiderReferral.js";
import RiderReferralCode from "../models/rider/RiderReferralCode.js";
import { RiderReferralConfig, RIDER_REFERRAL_CONFIG_KEY } from "../models/rider/RiderReferralConfig.js";
import { RideBooking } from "../models/RideBooking.js";
import { riderLedger, tellRider, runRiderWalletSweep } from "./riderWallet.service.js";

// MBGO Referral Program (riders). Separate from MBConnect's partnerReferral.service.js.
//  - Each rider has one permanent code (RiderReferralCode).
//  - A new rider adds a code at sign-up (email or Google) -- the app applies it
//    right after the first sign-in -- or later in Refer & Earn, within
//    config.linkWindowDays of sign-up and before their first paid ride.
//  - Qualifies when the new rider's email is verified (always true once they
//    can sign in), then fraud checks, then BOTH get money in their wallet:
//    referrer terms.referrerReward, new rider terms.joiningBonus. No lock.
// Every state change is an atomic findOneAndUpdate guarded on the current
// state, so retries / double taps can never pay twice.

export const DEFAULT_RIDER_REFERRAL_CONFIG = {
  enabled: false,
  referrerReward: 50,
  joiningBonus: 50,
  expiryDays: 90,
  dailyLimit: 10,
  linkWindowDays: 7,
  maxWalletPerRide: 0,
  terms: "",
};

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
export const RIDER_BLOCKED_STATUSES = ["Suspended", "Deleted"];

export function normalizeRiderReferralConfig(doc) {
  const c = doc || {};
  const d = DEFAULT_RIDER_REFERRAL_CONFIG;
  return {
    enabled: !!c.enabled,
    referrerReward: Math.max(0, num(c.referrerReward, d.referrerReward)),
    joiningBonus: Math.max(0, num(c.joiningBonus, d.joiningBonus)),
    expiryDays: Math.max(1, Math.round(num(c.expiryDays, d.expiryDays))),
    dailyLimit: Math.max(1, Math.round(num(c.dailyLimit, d.dailyLimit))),
    linkWindowDays: Math.max(0, Math.round(num(c.linkWindowDays, d.linkWindowDays))),
    maxWalletPerRide: Math.max(0, num(c.maxWalletPerRide, d.maxWalletPerRide)),
    terms: String(c.terms || ""),
  };
}

export async function getRiderReferralConfig() {
  return normalizeRiderReferralConfig(await RiderReferralConfig.findOne({ key: RIDER_REFERRAL_CONFIG_KEY }).lean());
}

// ---------------- Codes ----------------

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L
export function generateRiderReferralCode() {
  const bytes = crypto.randomBytes(5);
  let out = "MBG";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}
export const normalizeRiderCode = (code) => String(code || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);

export async function ensureRiderReferralCode(authId) {
  const existing = await RiderReferralCode.findOne({ authId }).select("code").lean();
  if (existing) return existing.code;
  for (let i = 0; i < 6; i++) {
    try {
      const created = await RiderReferralCode.create({ authId, code: generateRiderReferralCode() });
      return created.code;
    } catch (e) {
      if (e?.code !== 11000) throw e;
      const again = await RiderReferralCode.findOne({ authId }).select("code").lean(); // lost a race on authId
      if (again) return again.code;
    }
  }
  throw new Error("Could not create a referral code");
}

// "Ravi Kumar" -> "Ravi K." (never the full name / contact).
export function maskRiderName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MBGO rider";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export async function findRiderReferrerByCode(code) {
  const c = normalizeRiderCode(code);
  if (!/^MBG[2-9A-Z]{5}$/.test(c)) return null;
  const row = await RiderReferralCode.findOne({ code: c }).select("authId").lean();
  if (!row) return null;
  const [auth, profile] = await Promise.all([
    RiderAuth.findById(row.authId).select("status isEmailVerified").lean(),
    RiderProfile.findOne({ authId: row.authId }).select("fullName").lean(),
  ]);
  if (!auth) return null;
  return { authId: row.authId, status: auth.status, verified: !!auth.isEmailVerified, name: maskRiderName(profile?.fullName), code: c };
}

// ---------------- Pure rules (unit-tested) ----------------

/**
 * Why a code can't be added ("" = it can).
 * referred: { authId, alreadyLinked, accountAgeDays, hasPaidRide }
 */
export function riderLinkBlockReason({ cfg, referred, referrer }) {
  if (!cfg.enabled) return "The referral program isn't active right now.";
  if (!referrer) return "This referral code doesn't exist. Please check and try again.";
  if (String(referrer.authId) === String(referred.authId)) return "You can't use your own referral code.";
  if (RIDER_BLOCKED_STATUSES.includes(referrer.status) || !referrer.verified) return "This referral code can't be used.";
  if (referred.alreadyLinked) return "A referral code is already added to your account.";
  if (referred.hasPaidRide) return "Referral codes can only be added before your first ride booking.";
  const windowDays = Math.max(1, cfg.linkWindowDays);
  if (referred.accountAgeDays > windowDays) return `Referral codes can only be added within ${windowDays} day${windowDays === 1 ? "" : "s"} of creating your account.`;
  return "";
}

/** Fraud signals between two riders ({ mobile, pushToken }) + today's count for the referrer. */
export function computeRiderFraudFlags({ referrer, referred, todayCount = 0, dailyLimit = 10 }) {
  const flags = [];
  const digits = (m) => String(m || "").replace(/\D/g, "").slice(-10);
  if (referrer && referred) {
    if (digits(referrer.mobile).length === 10 && digits(referrer.mobile) === digits(referred.mobile)) {
      flags.push({ key: "SAME_MOBILE", label: "Same mobile number as the referrer" });
    }
    if (referrer.pushToken && referrer.pushToken === referred.pushToken) flags.push({ key: "SAME_DEVICE", label: "Same phone (device) as the referrer" });
  }
  if (todayCount >= dailyLimit) flags.push({ key: "DAILY_LIMIT", label: `Referrer already had ${todayCount} referrals that day (limit ${dailyLimit})` });
  return flags;
}

// ---------------- Helpers ----------------

const sys = (action, note) => ({ at: new Date(), action, note, by: "SYSTEM" });

async function fraudData(authId) {
  const p = await RiderProfile.findOne({ authId }).select("mobileNumber pushToken").lean();
  return { mobile: p?.mobileNumber || "", pushToken: p?.pushToken || "" };
}

async function tell(authId, title, message, extra = {}) {
  const p = await RiderProfile.findOne({ authId }).select("_id").lean();
  if (p) await tellRider(p._id, title, message, { screen: "refer-earn", ...extra });
}

const startOfDay = (d = new Date()) => {
  const ist = new Date(d.getTime() + 5.5 * 3600e3); // India day boundary
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600e3);
};

// ---------------- Linking ----------------

/** Adds `code` to the signed-in rider; qualifies at once (they're verified). Returns { referral, referrerName } or { error }. */
export async function linkRiderReferral({ referredAuthId, code, source = "email" }) {
  const cfg = await getRiderReferralConfig();
  const [referrer, referredAuth, referredProfile, existing] = await Promise.all([
    findRiderReferrerByCode(code),
    RiderAuth.findById(referredAuthId).select("status isEmailVerified createdAt authProviders").lean(),
    RiderProfile.findOne({ authId: referredAuthId }).select("_id").lean(),
    RiderReferral.exists({ referredAuthId }),
  ]);
  if (!referredAuth || !referredProfile) return { error: "Account not found." };
  const hasPaidRide = !!(await RideBooking.exists({ rider: referredProfile._id, "paymentInfo.status": "Paid" }));
  const reason = riderLinkBlockReason({
    cfg,
    referrer,
    referred: {
      authId: referredAuthId,
      alreadyLinked: !!existing,
      hasPaidRide,
      accountAgeDays: (Date.now() - new Date(referredAuth.createdAt || Date.now()).getTime()) / 86400e3,
    },
  });
  if (reason) return { error: reason };
  // Sign-up codes: record how the account was really created (Google accounts are ["google"]).
  if (source !== "later") {
    const providers = referredAuth.authProviders || [];
    source = providers.length === 1 && providers[0] === "google" ? "google" : "email";
  }

  const todayCount = await RiderReferral.countDocuments({ referrerAuthId: referrer.authId, createdAt: { $gte: startOfDay() } });
  const flags = computeRiderFraudFlags({ todayCount, dailyLimit: cfg.dailyLimit });
  const now = new Date();
  let referral;
  try {
    referral = await RiderReferral.create({
      code: referrer.code,
      referrerAuthId: referrer.authId,
      referredAuthId,
      source: ["email", "google", "later"].includes(source) ? source : "email",
      terms: { referrerReward: cfg.referrerReward, joiningBonus: cfg.joiningBonus, expiryDays: cfg.expiryDays },
      expiresAt: new Date(now.getTime() + cfg.expiryDays * 86400e3),
      flags,
      timeline: [sys("LINKED", `Code ${referrer.code} added (${source})${flags.length ? ` · flagged: ${flags.map((f) => f.label).join("; ")}` : ""}`)],
    });
  } catch (e) {
    if (e?.code === 11000) return { error: "A referral code is already added to your account." };
    throw e;
  }
  if (referredAuth.isEmailVerified) await onRiderVerified(referredAuthId);
  return { referral: await RiderReferral.findById(referral._id).lean(), referrerName: referrer.name };
}

// ---------------- Verified -> reward ----------------

/** The new rider's email is verified: LINKED -> QUALIFIED -> processed. Safe to call any number of times. */
export async function onRiderVerified(authId) {
  const now = new Date();
  const q = await RiderReferral.findOneAndUpdate(
    { referredAuthId: authId, status: "LINKED", expiresAt: { $gt: now } },
    { $set: { status: "QUALIFIED", qualifiedAt: now }, $push: { timeline: sys("QUALIFIED", "New rider's email verified") } },
    { new: true }
  );
  if (q) await processRiderReferral(q._id);
}

/** QUALIFIED -> fraud checks -> IN_REVIEW or REWARDED (+ credits). REWARDED -> finish any unpaid credit. */
export async function processRiderReferral(referralId) {
  let r = await RiderReferral.findById(referralId);
  if (!r) return null;
  if (r.status === "QUALIFIED") {
    const referrerAuth = await RiderAuth.findById(r.referrerAuthId).select("status").lean();
    if (!referrerAuth || RIDER_BLOCKED_STATUSES.includes(referrerAuth.status)) {
      await RiderReferral.updateOne(
        { _id: r._id, status: "QUALIFIED" },
        { $set: { status: "IN_REVIEW", flags: [...(r.flags || []), { key: "REFERRER_BLOCKED", label: "Referrer account is suspended or deleted" }] }, $push: { timeline: sys("FLAGGED", "Referrer account is blocked") } }
      );
      return RiderReferral.findById(r._id);
    }
    if (!r.reviewCleared) {
      const [a, b] = await Promise.all([fraudData(r.referrerAuthId), fraudData(r.referredAuthId)]);
      const flags = [...(r.flags || []).filter((f) => f.key === "DAILY_LIMIT"), ...computeRiderFraudFlags({ referrer: a, referred: b, todayCount: 0, dailyLimit: Infinity })];
      if (flags.length) {
        await RiderReferral.updateOne(
          { _id: r._id, status: "QUALIFIED" },
          { $set: { status: "IN_REVIEW", flags }, $push: { timeline: sys("FLAGGED", `Sent to admin review: ${flags.map((f) => f.label).join("; ")}`) } }
        );
        return RiderReferral.findById(r._id);
      }
    }
    r = await RiderReferral.findOneAndUpdate(
      { _id: r._id, status: "QUALIFIED" },
      { $set: { status: "REWARDED", rewardedAt: new Date() }, $push: { timeline: sys("REWARDED", "Checks passed — rewards added to both wallets") } },
      { new: true }
    );
    if (!r) return RiderReferral.findById(referralId);
  }
  if (r.status === "REWARDED") await payRiderCredits(r);
  return RiderReferral.findById(referralId);
}

// Each side is claimed with its own flag first (atomic), then credited.
async function payRiderCredits(r) {
  const t = r.terms || {};
  const joinee = await RiderReferral.findOneAndUpdate({ _id: r._id, status: "REWARDED", joineeCredited: false }, { $set: { joineeCredited: true } });
  if (joinee && t.joiningBonus > 0) {
    const p = await RiderProfile.findOneAndUpdate({ authId: r.referredAuthId }, { $inc: { walletBalance: t.joiningBonus } }, { new: true });
    if (p) {
      await riderLedger(p, "referral_joining_bonus", t.joiningBonus, { referralId: r._id, note: `Joining bonus (code ${r.code})` });
      tell(r.referredAuthId, "Joining bonus added", `${inr(t.joiningBonus)} has been added to your MB Wallet. Use it on your next ride!`);
    }
  }
  const referrer = await RiderReferral.findOneAndUpdate({ _id: r._id, status: "REWARDED", referrerCredited: false }, { $set: { referrerCredited: true } });
  if (referrer && t.referrerReward > 0) {
    const p = await RiderProfile.findOneAndUpdate({ authId: r.referrerAuthId }, { $inc: { walletBalance: t.referrerReward } }, { new: true });
    if (p) {
      await riderLedger(p, "referral_reward", t.referrerReward, { referralId: r._id, note: `Referral reward — ${r.code}` });
      tell(r.referrerAuthId, "Referral reward earned", `A friend joined MBGO with your code. ${inr(t.referrerReward)} has been added to your MB Wallet.`);
    }
  }
}

// ---------------- Admin actions ----------------

/** action: APPROVE_REVIEW | REJECT | REVERSE | EXTEND; staff: { id, name } */
export async function adminRiderReferralAction(referralId, { action, note = "", days = 30 }, staff) {
  const by = { at: new Date(), by: staff.name, byId: staff.id };
  note = String(note || "").trim().slice(0, 300);
  if (action === "APPROVE_REVIEW") {
    const r = await RiderReferral.findOneAndUpdate(
      { _id: referralId, status: "IN_REVIEW" },
      { $set: { status: "QUALIFIED", reviewCleared: true }, $push: { timeline: { ...by, action: "REVIEW_APPROVED", note: note || "Approved after review" } } },
      { new: true }
    );
    if (!r) return { error: "Only referrals in review can be approved.", code: 409 };
    return { referral: await processRiderReferral(r._id) };
  }
  if (action === "REJECT") {
    if (!note) return { error: "Add a reason — the riders will see it.", code: 400 };
    const r = await RiderReferral.findOneAndUpdate(
      { _id: referralId, status: { $in: ["LINKED", "QUALIFIED", "IN_REVIEW"] } },
      { $set: { status: "REJECTED", rejectedAt: new Date(), rejectReason: note }, $push: { timeline: { ...by, action: "REJECTED", note } } },
      { new: true }
    );
    if (!r) return { error: "This referral can't be rejected now (it may already be rewarded — use Reverse).", code: 409 };
    tell(r.referrerAuthId, "Referral not rewarded", `The referral with your code ${r.code} was not approved: ${note}`);
    return { referral: r };
  }
  if (action === "EXTEND") {
    const d = Math.min(365, Math.max(1, Math.round(Number(days) || 30)));
    const r = await RiderReferral.findOneAndUpdate(
      { _id: referralId, status: { $in: ["LINKED", "EXPIRED"] } },
      [
        {
          $set: {
            status: "LINKED",
            expiresAt: { $add: [{ $max: ["$$NOW", { $ifNull: ["$expiresAt", "$$NOW"] }] }, d * 86400e3] },
            timeline: { $concatArrays: [{ $ifNull: ["$timeline", []] }, { $literal: [{ ...by, action: "EXTENDED", note: `${d} more days${note ? ` — ${note}` : ""}` }] }] },
          },
        },
      ],
      { new: true }
    );
    if (!r) return { error: "Only pending or expired referrals can be extended.", code: 409 };
    const a = await RiderAuth.findById(r.referredAuthId).select("isEmailVerified").lean();
    if (a?.isEmailVerified) await onRiderVerified(r.referredAuthId);
    return { referral: await RiderReferral.findById(r._id) };
  }
  if (action === "REVERSE") {
    if (!note) return { error: "Add a reason for the reversal.", code: 400 };
    const r = await RiderReferral.findOneAndUpdate(
      { _id: referralId, status: "REWARDED" },
      { $set: { status: "REVERSED", reversedAt: new Date(), reverseReason: note }, $push: { timeline: { ...by, action: "REVERSED", note } } },
      { new: true }
    );
    if (!r) return { error: "Only rewarded referrals can be reversed.", code: 409 };
    const t = r.terms || {};
    const extra = { referralId: r._id, note: `Reversed: ${note}`, adminId: staff.id, adminName: staff.name };
    if (r.referrerCredited && t.referrerReward > 0) {
      const p = await RiderProfile.findOneAndUpdate({ authId: r.referrerAuthId }, { $inc: { walletBalance: -t.referrerReward } }, { new: true });
      if (p) await riderLedger(p, "referral_reversal", t.referrerReward, extra);
      tell(r.referrerAuthId, "Referral reward reversed", `${inr(t.referrerReward)} referral reward for code ${r.code} was reversed: ${note}`);
    }
    if (r.joineeCredited && t.joiningBonus > 0) {
      const p = await RiderProfile.findOneAndUpdate({ authId: r.referredAuthId }, { $inc: { walletBalance: -t.joiningBonus } }, { new: true });
      if (p) await riderLedger(p, "referral_reversal", t.joiningBonus, extra);
      tell(r.referredAuthId, "Joining bonus reversed", `${inr(t.joiningBonus)} joining bonus was reversed: ${note}`);
    }
    return { referral: r };
  }
  return { error: "Invalid action.", code: 400 };
}

// ---------------- Background job ----------------

export async function runRiderReferralMaintenance() {
  const now = new Date();
  const expired = await RiderReferral.updateMany(
    { status: "LINKED", expiresAt: { $lte: now } },
    { $set: { status: "EXPIRED", expiredAt: now }, $push: { timeline: sys("EXPIRED", "New rider didn't verify in time") } }
  );
  const stuck = await RiderReferral.find({
    $or: [{ status: "QUALIFIED" }, { status: "REWARDED", $or: [{ referrerCredited: false }, { joineeCredited: false }] }],
  })
    .select("_id")
    .limit(200)
    .lean();
  for (const s of stuck) {
    try {
      await processRiderReferral(s._id);
    } catch (e) {
      console.error("Rider referral retry failed:", String(s._id), e.message);
    }
  }
  return { expired: expired.modifiedCount || 0, retried: stuck.length };
}

/** Every 5 min: wallet holds/refunds on rides + referral expiry/retries. */
export function startMbgoWalletCron() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const w = await runRiderWalletSweep();
      const r = await runRiderReferralMaintenance();
      if (w.released || w.refunded || r.expired || r.retried) console.log("MBGO wallet/referral maintenance", { ...w, ...r });
    } catch (e) {
      console.log("MBGO wallet/referral maintenance failed", { error: e.message });
    }
  });
}

/** Wallet totals vs the ledger (admin overview). */
export async function riderWalletSummary() {
  const RiderWalletTransaction = (await import("../models/rider/RiderWalletTransaction.js")).default;
  const [bal, sums] = await Promise.all([
    RiderProfile.aggregate([{ $match: { walletBalance: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$walletBalance" }, riders: { $sum: 1 } } }]),
    RiderWalletTransaction.aggregate([{ $group: { _id: "$type", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);
  return {
    walletLiability: money(bal[0]?.total),
    ridersWithBalance: bal[0]?.riders || 0,
    ledger: Object.fromEntries(sums.map((x) => [x._id, { amount: money(x.amount), count: x.count }])),
  };
}
