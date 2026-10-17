import crypto from "crypto";
import cron from "node-cron";
import PartnerAuth from "../models/partner/PartnerAuth.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerBank from "../models/partner/PartnerBank.js";
import PartnerVehicle from "../models/partner/PartnerVehicle.js";
import PartnerReferral from "../models/partner/PartnerReferral.js";
import PartnerWalletTransaction from "../models/partner/PartnerWalletTransaction.js";
import { PartnerReferralConfig, PARTNER_REFERRAL_CONFIG_KEY } from "../models/partner/PartnerReferralConfig.js";
import { notifyUser } from "./notification/notificationService.js";
import { isPartnerApproved, BLOCKED_STATUSES } from "./partnerAccount.service.js";

// MBConnect Referral Program.
//  - Each driver has one permanent code (PartnerAuth.referralCode).
//  - A new driver links a code at sign-up (email or Google) or later, until
//    they submit their profile for approval.
//  - When admin approves the new driver: fraud checks, then the referrer gets
//    terms.referrerReward into the LOCKED referralBalance and the new driver
//    gets terms.joiningBonus straight into walletBalance -- once each.
//  - At config.unlockAfter rewarded referrals the referrer's locked balance
//    moves into the wallet (once); later rewards go straight to the wallet.
// Every state change is an atomic findOneAndUpdate guarded on the current
// state, so retries / double clicks can never pay twice. Nothing here runs
// inside the approval request's success path: a referral problem can never
// fail an approval (see onPartnerApproved).

export const DEFAULT_REFERRAL_CONFIG = {
  enabled: false,
  referrerReward: 100,
  joiningBonus: 100,
  unlockAfter: 25,
  expiryDays: 90,
  dailyLimit: 10,
  terms: "",
};

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function normalizeReferralConfig(doc) {
  const c = doc || {};
  const d = DEFAULT_REFERRAL_CONFIG;
  return {
    enabled: !!c.enabled,
    referrerReward: num(c.referrerReward, d.referrerReward),
    joiningBonus: num(c.joiningBonus, d.joiningBonus),
    unlockAfter: Math.max(1, Math.round(num(c.unlockAfter, d.unlockAfter))),
    expiryDays: Math.max(1, Math.round(num(c.expiryDays, d.expiryDays))),
    dailyLimit: Math.max(1, Math.round(num(c.dailyLimit, d.dailyLimit))),
    terms: String(c.terms || ""),
  };
}

export async function getReferralConfig() {
  return normalizeReferralConfig(await PartnerReferralConfig.findOne({ key: PARTNER_REFERRAL_CONFIG_KEY }).lean());
}

// ---------------- Codes ----------------

// No look-alike characters (0/O, 1/I/L).
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function generateReferralCode() {
  const bytes = crypto.randomBytes(5);
  let out = "MBC";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}
export const normalizeReferralCode = (code) => String(code || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);

// Returns the driver's code, creating it once if missing (unique index protects races).
export async function ensureReferralCode(authId) {
  const existing = await PartnerAuth.findById(authId).select("referralCode").lean();
  if (!existing) return null;
  if (existing.referralCode) return existing.referralCode;
  for (let i = 0; i < 6; i++) {
    try {
      const updated = await PartnerAuth.findOneAndUpdate(
        { _id: authId, referralCode: { $exists: false } },
        { $set: { referralCode: generateReferralCode() } },
        { new: true }
      ).select("referralCode");
      if (updated?.referralCode) return updated.referralCode;
      const again = await PartnerAuth.findById(authId).select("referralCode").lean();
      if (again?.referralCode) return again.referralCode;
    } catch (e) {
      if (e?.code !== 11000) throw e; // collision: try another code
    }
  }
  throw new Error("Could not create a referral code");
}

// "Ravi Kumar" -> "Ravi K." (shown to other drivers; never the full name / contact).
export function maskName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MBConnect partner";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export async function findReferrerByCode(code) {
  const c = normalizeReferralCode(code);
  if (!/^MBC[2-9A-Z]{5}$/.test(c)) return null;
  const auth = await PartnerAuth.findOne({ referralCode: c }).select("status").lean();
  if (!auth) return null;
  const profile = await PartnerProfile.findOne({ authId: auth._id }).select("fullName").lean();
  return { authId: auth._id, status: auth.status, name: maskName(profile?.fullName), code: c };
}

// ---------------- Pure rules (unit-tested) ----------------

/**
 * Why a code can't be linked ("" = it can).
 * referred: { authId, profileSubmitted, approved, alreadyLinked }
 * referrer: { authId, status } | null
 */
export function linkBlockReason({ cfg, referred, referrer }) {
  if (!cfg.enabled) return "The referral program isn't active right now.";
  if (!referrer) return "This referral code doesn't exist. Please check and try again.";
  if (String(referrer.authId) === String(referred.authId)) return "You can't use your own referral code.";
  if (BLOCKED_STATUSES.includes(referrer.status)) return "This referral code can't be used.";
  if (referred.alreadyLinked) return "A referral code is already added to your account.";
  if (referred.approved || referred.profileSubmitted) return "Referral codes can only be added before you submit your profile for approval.";
  return "";
}

/**
 * Fraud signals between two drivers. Each side:
 * { mobile, bankAccount, vehicleRegs: [], pushToken }
 * Plus how many referrals the referrer already has today.
 */
export function computeFraudFlags({ referrer, referred, todayCount = 0, dailyLimit = 10 }) {
  const flags = [];
  const same = (a, b) => !!a && !!b && String(a).replace(/\s+/g, "").toUpperCase() === String(b).replace(/\s+/g, "").toUpperCase();
  const digits = (m) => String(m || "").replace(/\D/g, "").slice(-10);
  if (referrer && referred) {
    if (digits(referrer.mobile).length === 10 && digits(referrer.mobile) === digits(referred.mobile)) {
      flags.push({ key: "SAME_MOBILE", label: "Same mobile number as the referrer" });
    }
    if (same(referrer.bankAccount, referred.bankAccount)) flags.push({ key: "SAME_BANK", label: "Same bank account as the referrer" });
    const regs = new Set((referrer.vehicleRegs || []).map((r) => String(r).replace(/\s+/g, "").toUpperCase()).filter(Boolean));
    if ((referred.vehicleRegs || []).some((r) => regs.has(String(r).replace(/\s+/g, "").toUpperCase()))) {
      flags.push({ key: "SAME_VEHICLE", label: "Same vehicle registration as the referrer" });
    }
    if (same(referrer.pushToken, referred.pushToken)) flags.push({ key: "SAME_DEVICE", label: "Same phone (device) as the referrer" });
  }
  if (todayCount >= dailyLimit) {
    flags.push({ key: "DAILY_LIMIT", label: `Referrer already had ${todayCount} referrals that day (limit ${dailyLimit})` });
  }
  return flags;
}

// ---------------- Helpers ----------------

const sys = (action, note) => ({ at: new Date(), action, note, by: "SYSTEM" });

async function fraudData(authId) {
  const profile = await PartnerProfile.findOne({ authId }).select("_id mobileNumber pushToken").lean();
  if (!profile) return { mobile: "", bankAccount: "", vehicleRegs: [], pushToken: "" };
  const [bank, vehicles] = await Promise.all([
    PartnerBank.findOne({ partnerId: profile._id, isPrimary: true }).select("accountNumber").lean(),
    PartnerVehicle.find({ partnerId: profile._id, isDeleted: { $ne: true } }).select("registrationNumber").lean(),
  ]);
  return {
    mobile: profile.mobileNumber || "",
    bankAccount: bank?.accountNumber || "",
    vehicleRegs: vehicles.map((v) => v.registrationNumber).filter(Boolean),
    pushToken: profile.pushToken || "",
  };
}

// Best effort: a notification problem never affects the money flow.
const tell = async (authId, title, message, extraData = {}) => {
  try {
    const profile = await PartnerProfile.findOne({ authId }).select("_id pushToken").lean();
    if (!profile) return;
    await notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title,
      message,
      type: "Payout",
      data: { screen: "ReferEarn", ...extraData },
      pushToken: profile.pushToken,
    });
  } catch (e) {
    console.error("Referral notification error:", e.message);
  }
};

async function ledger(profile, type, amount, referral, extra = {}) {
  return PartnerWalletTransaction.create({
    partnerId: profile.authId,
    type,
    amount: money(Math.abs(amount)),
    walletBalanceAfter: money(profile.walletBalance),
    pendingWalletBalanceAfter: money(profile.pendingWalletBalance),
    referralBalanceAfter: money(profile.referralBalance),
    referralId: referral._id,
    note: extra.note,
    adminId: extra.adminId,
    adminName: extra.adminName,
  });
}

const startOfDay = (d = new Date()) => {
  // India day boundary (IST = UTC+5:30).
  const ist = new Date(d.getTime() + 5.5 * 3600e3);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600e3);
};

// ---------------- Linking ----------------

/**
 * Links `code` to the new driver. Returns { referral } or { error }.
 * source: "email" | "google" | "later"
 */
export async function linkReferral({ referredAuthId, code, source = "email" }) {
  const cfg = await getReferralConfig();
  const [referrer, referredAuth, referredProfile, existing] = await Promise.all([
    findReferrerByCode(code),
    PartnerAuth.findById(referredAuthId).select("status").lean(),
    PartnerProfile.findOne({ authId: referredAuthId }).select("isSubmittedForApproval").lean(),
    PartnerReferral.exists({ referredAuthId }),
  ]);
  if (!referredAuth) return { error: "Account not found." };
  const approved = await isPartnerApproved(referredAuthId);
  const reason = linkBlockReason({
    cfg,
    referrer,
    referred: { authId: referredAuthId, profileSubmitted: !!referredProfile?.isSubmittedForApproval, approved, alreadyLinked: !!existing },
  });
  if (reason) return { error: reason };

  const todayCount = await PartnerReferral.countDocuments({ referrerAuthId: referrer.authId, createdAt: { $gte: startOfDay() } });
  const flags = computeFraudFlags({ todayCount, dailyLimit: cfg.dailyLimit });
  const now = new Date();
  let referral;
  try {
    referral = await PartnerReferral.create({
      code: referrer.code,
      referrerAuthId: referrer.authId,
      referredAuthId,
      source: ["email", "google", "later"].includes(source) ? source : "email",
      terms: { referrerReward: cfg.referrerReward, joiningBonus: cfg.joiningBonus, unlockAfter: cfg.unlockAfter, expiryDays: cfg.expiryDays },
      expiresAt: new Date(now.getTime() + cfg.expiryDays * 86400e3),
      flags,
      timeline: [sys("LINKED", `Code ${referrer.code} added (${source})${flags.length ? ` · flagged: ${flags.map((f) => f.label).join("; ")}` : ""}`)],
    });
  } catch (e) {
    if (e?.code === 11000) return { error: "A referral code is already added to your account." };
    throw e;
  }
  tell(referrer.authId, "Someone joined with your code", `A new partner joined MBConnect with your code ${referrer.code}. You'll get your reward once their account is approved.`, { referralId: String(referral._id) });
  return { referral, referrerName: referrer.name };
}

// ---------------- Approval -> reward ----------------

/**
 * Called after admin approves a driver (never awaited by the approval itself).
 *  - as the NEW driver: their LINKED referral becomes QUALIFIED and is processed
 *  - as a REFERRER: referrals that were waiting for this referrer's approval are processed
 */
export async function onPartnerApproved(authId) {
  const now = new Date();
  const q = await PartnerReferral.findOneAndUpdate(
    { referredAuthId: authId, status: "LINKED", expiresAt: { $gt: now } },
    { $set: { status: "QUALIFIED", qualifiedAt: now }, $push: { timeline: sys("QUALIFIED", "New partner's account approved by admin") } },
    { new: true }
  );
  if (q) await processReferral(q._id);
  const waiting = await PartnerReferral.find({ referrerAuthId: authId, status: "QUALIFIED" }).select("_id").lean();
  for (const w of waiting) await processReferral(w._id);
}

/** QUALIFIED -> fraud checks -> IN_REVIEW or REWARDED (+ credits). REWARDED -> finish any unpaid credit. */
export async function processReferral(referralId) {
  let r = await PartnerReferral.findById(referralId);
  if (!r) return null;
  if (r.status === "QUALIFIED") {
    // Referrer must be approved (and not blocked) to earn; otherwise wait.
    const referrerAuth = await PartnerAuth.findById(r.referrerAuthId).select("status").lean();
    if (!referrerAuth || BLOCKED_STATUSES.includes(referrerAuth.status)) {
      await PartnerReferral.updateOne(
        { _id: r._id, status: "QUALIFIED" },
        { $set: { status: "IN_REVIEW", flags: [...(r.flags || []), { key: "REFERRER_BLOCKED", label: "Referrer account is suspended, blacklisted or deleted" }] }, $push: { timeline: sys("FLAGGED", "Referrer account is blocked") } }
      );
      return PartnerReferral.findById(r._id);
    }
    if (!(await isPartnerApproved(r.referrerAuthId))) {
      if (r.timeline?.[r.timeline.length - 1]?.action !== "WAITING") {
        await PartnerReferral.updateOne({ _id: r._id, status: "QUALIFIED" }, { $push: { timeline: sys("WAITING", "Waiting for the referrer's own account to be approved") } });
      }
      return PartnerReferral.findById(r._id);
    }
    if (!r.reviewCleared) {
      const [a, b] = await Promise.all([fraudData(r.referrerAuthId), fraudData(r.referredAuthId)]);
      const flags = [...(r.flags || []).filter((f) => f.key === "DAILY_LIMIT"), ...computeFraudFlags({ referrer: a, referred: b, todayCount: 0, dailyLimit: Infinity })];
      if (flags.length) {
        await PartnerReferral.updateOne(
          { _id: r._id, status: "QUALIFIED" },
          { $set: { status: "IN_REVIEW", flags }, $push: { timeline: sys("FLAGGED", `Sent to admin review: ${flags.map((f) => f.label).join("; ")}`) } }
        );
        return PartnerReferral.findById(r._id);
      }
    }
    r = await PartnerReferral.findOneAndUpdate(
      { _id: r._id, status: "QUALIFIED" },
      { $set: { status: "REWARDED", rewardedAt: new Date() }, $push: { timeline: sys("REWARDED", "Checks passed — rewards released") } },
      { new: true }
    );
    if (!r) return PartnerReferral.findById(referralId);
  }
  if (r.status === "REWARDED") await payCredits(r);
  return PartnerReferral.findById(referralId);
}

// Each side is claimed with its own flag first (atomic), then credited.
async function payCredits(r) {
  const t = r.terms || {};
  // New driver's joining bonus -> wallet (withdrawable).
  const joinee = await PartnerReferral.findOneAndUpdate({ _id: r._id, status: "REWARDED", joineeCredited: false }, { $set: { joineeCredited: true } });
  if (joinee && t.joiningBonus > 0) {
    const p = await PartnerProfile.findOneAndUpdate({ authId: r.referredAuthId }, { $inc: { walletBalance: t.joiningBonus } }, { new: true });
    if (p) {
      await ledger(p, "referral_joining_bonus", t.joiningBonus, r, { note: `Joining bonus (code ${r.code})` });
      tell(r.referredAuthId, "Joining bonus added", `${inr(t.joiningBonus)} joining bonus has been added to your wallet. Welcome to MBConnect!`);
    }
  }
  // Referrer's reward -> locked balance, or wallet if already unlocked.
  const referrer = await PartnerReferral.findOneAndUpdate({ _id: r._id, status: "REWARDED", referrerCredited: false }, { $set: { referrerCredited: true } });
  if (referrer && t.referrerReward > 0) {
    let p = await PartnerProfile.findOneAndUpdate(
      { authId: r.referrerAuthId, referralUnlockedAt: null },
      { $inc: { referralBalance: t.referrerReward } },
      { new: true }
    );
    if (p) {
      await PartnerReferral.updateOne({ _id: r._id }, { $set: { referrerPaidTo: "locked" } });
      await ledger(p, "referral_bonus", t.referrerReward, r, { note: `Referral reward (locked) — ${r.code}` });
    } else {
      p = await PartnerProfile.findOneAndUpdate({ authId: r.referrerAuthId }, { $inc: { walletBalance: t.referrerReward } }, { new: true });
      if (p) {
        await PartnerReferral.updateOne({ _id: r._id }, { $set: { referrerPaidTo: "wallet" } });
        await ledger(p, "referral_reward", t.referrerReward, r, { note: `Referral reward — ${r.code}` });
      }
    }
    if (p) {
      const count = await PartnerReferral.countDocuments({ referrerAuthId: r.referrerAuthId, status: "REWARDED" });
      const cfg = await getReferralConfig();
      tell(
        r.referrerAuthId,
        "Referral reward earned",
        p.referralUnlockedAt
          ? `${inr(t.referrerReward)} referral reward added to your wallet.`
          : `${inr(t.referrerReward)} referral reward added (locked). ${count}/${cfg.unlockAfter} referrals — it unlocks at ${cfg.unlockAfter}.`
      );
      await checkUnlock(r.referrerAuthId);
    }
  }
}

/** Moves the whole locked referral balance into the wallet once the referrer has enough rewarded referrals. */
export async function checkUnlock(referrerAuthId) {
  const cfg = await getReferralConfig();
  const count = await PartnerReferral.countDocuments({ referrerAuthId, status: "REWARDED" });
  if (count < cfg.unlockAfter) return null;
  // Atomic: only the first caller moves the money (returns the doc BEFORE the update).
  const before = await PartnerProfile.findOneAndUpdate(
    { authId: referrerAuthId, referralUnlockedAt: null },
    [{ $set: { walletBalance: { $add: [{ $ifNull: ["$walletBalance", 0] }, { $ifNull: ["$referralBalance", 0] }] }, referralBalance: 0, referralUnlockedAt: "$$NOW" } }],
    { new: false }
  );
  if (!before) return null;
  const moved = money(before.referralBalance);
  const after = await PartnerProfile.findById(before._id);
  await PartnerWalletTransaction.create({
    partnerId: after.authId,
    type: "referral_unlock",
    amount: moved,
    walletBalanceAfter: money(after.walletBalance),
    pendingWalletBalanceAfter: money(after.pendingWalletBalance),
    referralBalanceAfter: 0,
    note: `Referral bonus unlocked after ${count} referrals`,
  });
  tell(referrerAuthId, "Referral bonus unlocked 🎉", `You reached ${count} referrals! ${inr(moved)} referral bonus moved to your wallet and can now be withdrawn. Future rewards go straight to your wallet.`);
  return moved;
}

// ---------------- Admin actions ----------------

/**
 * action: APPROVE_REVIEW | REJECT | REVERSE | EXTEND
 * staff: { id, name }; note: required for REJECT / REVERSE; days for EXTEND
 */
export async function adminReferralAction(referralId, { action, note = "", days = 30 }, staff) {
  const by = { at: new Date(), by: staff.name, byId: staff.id };
  note = String(note || "").trim().slice(0, 300);
  if (action === "APPROVE_REVIEW") {
    const r = await PartnerReferral.findOneAndUpdate(
      { _id: referralId, status: "IN_REVIEW" },
      { $set: { status: "QUALIFIED", reviewCleared: true }, $push: { timeline: { ...by, action: "REVIEW_APPROVED", note: note || "Approved after review" } } },
      { new: true }
    );
    if (!r) return { error: "Only referrals in review can be approved.", code: 409 };
    return { referral: await processReferral(r._id) };
  }
  if (action === "REJECT") {
    if (!note) return { error: "Add a reason — the partners will see it.", code: 400 };
    const r = await PartnerReferral.findOneAndUpdate(
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
    const r = await PartnerReferral.findOneAndUpdate(
      { _id: referralId, status: { $in: ["LINKED", "EXPIRED"] } },
      [
        {
          $set: {
            status: "LINKED",
            expiresAt: { $add: [{ $max: ["$$NOW", { $ifNull: ["$expiresAt", "$$NOW"] }] }, d * 86400e3] },
            // $literal: the admin's note is plain text, never an expression.
            timeline: { $concatArrays: [{ $ifNull: ["$timeline", []] }, { $literal: [{ ...by, action: "EXTENDED", note: `${d} more days${note ? ` — ${note}` : ""}` }] }] },
          },
        },
      ],
      { new: true }
    );
    if (!r) return { error: "Only pending or expired referrals can be extended.", code: 409 };
    // Already approved meanwhile? Qualify it now.
    if (await isPartnerApproved(r.referredAuthId)) await onPartnerApproved(r.referredAuthId);
    return { referral: await PartnerReferral.findById(r._id) };
  }
  if (action === "REVERSE") {
    if (!note) return { error: "Add a reason for the reversal.", code: 400 };
    const r = await PartnerReferral.findOneAndUpdate(
      { _id: referralId, status: "REWARDED" },
      { $set: { status: "REVERSED", reversedAt: new Date(), reverseReason: note }, $push: { timeline: { ...by, action: "REVERSED", note } } },
      { new: true }
    );
    if (!r) return { error: "Only rewarded referrals can be reversed.", code: 409 };
    const t = r.terms || {};
    const extra = { note: `Reversed: ${note}`, adminId: staff.id, adminName: staff.name };
    if (r.referrerCredited && t.referrerReward > 0) {
      // Take it from where it is now: still-locked balance, else the wallet.
      let p = r.referrerPaidTo === "locked"
        ? await PartnerProfile.findOneAndUpdate({ authId: r.referrerAuthId, referralUnlockedAt: null }, { $inc: { referralBalance: -t.referrerReward } }, { new: true })
        : null;
      if (!p) p = await PartnerProfile.findOneAndUpdate({ authId: r.referrerAuthId }, { $inc: { walletBalance: -t.referrerReward } }, { new: true });
      if (p) await ledger(p, "referral_reversal", t.referrerReward, r, extra);
      tell(r.referrerAuthId, "Referral reward reversed", `${inr(t.referrerReward)} referral reward for code ${r.code} was reversed: ${note}`);
    }
    if (r.joineeCredited && t.joiningBonus > 0) {
      const p = await PartnerProfile.findOneAndUpdate({ authId: r.referredAuthId }, { $inc: { walletBalance: -t.joiningBonus } }, { new: true });
      if (p) await ledger(p, "referral_reversal", t.joiningBonus, r, extra);
      tell(r.referredAuthId, "Joining bonus reversed", `${inr(t.joiningBonus)} joining bonus was reversed: ${note}`);
    }
    return { referral: r };
  }
  return { error: "Invalid action.", code: 400 };
}

// ---------------- Background job ----------------

/** Expires overdue referrals and finishes anything left half-done (e.g. after a restart). */
export async function runReferralMaintenance() {
  const now = new Date();
  const expired = await PartnerReferral.updateMany(
    { status: "LINKED", expiresAt: { $lte: now } },
    { $set: { status: "EXPIRED", expiredAt: now }, $push: { timeline: sys("EXPIRED", "New partner wasn't approved in time") } }
  );
  const stuck = await PartnerReferral.find({
    $or: [{ status: "QUALIFIED" }, { status: "REWARDED", $or: [{ referrerCredited: false }, { joineeCredited: false }] }],
  })
    .select("_id")
    .limit(200)
    .lean();
  for (const s of stuck) {
    try {
      await processReferral(s._id);
    } catch (e) {
      console.error("Referral retry failed:", String(s._id), e.message);
    }
  }
  return { expired: expired.modifiedCount || 0, retried: stuck.length };
}

export function startReferralMaintenanceCron() {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const r = await runReferralMaintenance();
      if (r.expired || r.retried) console.log("Referral maintenance", r);
    } catch (e) {
      console.log("Referral maintenance failed", { error: e.message });
    }
  });
}

// ---------------- Reconciliation ----------------

/** Locked balances vs the ledger: every driver's referralBalance must equal credits − unlocks − reversals (locked). */
export async function referralReconciliation() {
  const [totals, ledgerSums] = await Promise.all([
    PartnerProfile.aggregate([{ $match: { referralBalance: { $ne: 0, $exists: true } } }, { $group: { _id: null, locked: { $sum: "$referralBalance" }, drivers: { $sum: 1 } } }]),
    PartnerWalletTransaction.aggregate([
      { $match: { type: { $in: ["referral_bonus", "referral_reward", "referral_joining_bonus", "referral_unlock", "referral_reversal"] } } },
      { $group: { _id: "$type", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);
  const by = Object.fromEntries(ledgerSums.map((x) => [x._id, { amount: money(x.amount), count: x.count }]));
  return {
    lockedLiability: money(totals[0]?.locked),
    driversWithLocked: totals[0]?.drivers || 0,
    ledger: by,
    paidOut: money((by.referral_bonus?.amount || 0) + (by.referral_reward?.amount || 0) + (by.referral_joining_bonus?.amount || 0) - (by.referral_reversal?.amount || 0)),
  };
}
