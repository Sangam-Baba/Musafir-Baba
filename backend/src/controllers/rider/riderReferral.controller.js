import RiderProfile from "../../models/rider/RiderProfile.js";
import RiderReferral from "../../models/rider/RiderReferral.js";
import RiderWalletTransaction from "../../models/rider/RiderWalletTransaction.js";
import { RideBooking } from "../../models/RideBooking.js";
import {
  getRiderReferralConfig,
  ensureRiderReferralCode,
  findRiderReferrerByCode,
  linkRiderReferral,
  maskRiderName,
  RIDER_BLOCKED_STATUSES,
} from "../../services/riderReferral.service.js";

// MBGO Refer & Earn + MB Wallet (rider side). Rules live in
// services/riderReferral.service.js and services/riderWallet.service.js.

const PENDING = ["LINKED", "QUALIFIED", "IN_REVIEW"];

// Simple per-IP limit so codes can't be guessed in bulk.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > 10 * 60e3) {
    hits.set(ip, { start: now, n: 1 });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > 10 * 60e3) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > 30;
}

// GET /api/rider-referral/validate?code=   (public, Create Account screen)
export const validateRiderReferralCode = async (req, res) => {
  try {
    if (limited(req.ip || "x")) return res.status(429).json({ success: false, message: "Too many tries. Please wait a few minutes." });
    const cfg = await getRiderReferralConfig();
    if (!cfg.enabled) return res.json({ success: true, valid: false, enabled: false, message: "The referral program isn't active right now." });
    const ref = await findRiderReferrerByCode(req.query.code);
    if (!ref || RIDER_BLOCKED_STATUSES.includes(ref.status) || !ref.verified) {
      return res.json({ success: true, valid: false, enabled: true, message: "This referral code doesn't exist." });
    }
    return res.json({ success: true, valid: true, enabled: true, code: ref.code, referrerName: ref.name, joiningBonus: cfg.joiningBonus });
  } catch (e) {
    console.error("Validate rider referral code error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/rider/referral
export const getMyRiderReferral = async (req, res) => {
  try {
    const authId = req.riderId;
    const cfg = await getRiderReferralConfig();
    const [code, profile, mine, linked] = await Promise.all([
      ensureRiderReferralCode(authId),
      RiderProfile.findOne({ authId }).select("_id walletBalance createdAt").lean(),
      RiderReferral.find({ referrerAuthId: authId }).sort({ createdAt: -1 }).limit(200).lean(),
      RiderReferral.findOne({ referredAuthId: authId }).lean(),
    ]);
    const names = new Map(
      (await RiderProfile.find({ authId: { $in: mine.map((m) => m.referredAuthId) } }).select("authId fullName").lean()).map((p) => [String(p.authId), p.fullName])
    );
    let referredBy = null;
    if (linked) {
      const rp = await RiderProfile.findOne({ authId: linked.referrerAuthId }).select("fullName").lean();
      referredBy = { name: maskRiderName(rp?.fullName), code: linked.code, status: linked.status, joiningBonus: linked.terms?.joiningBonus || 0 };
    }
    const hasPaidRide = profile ? !!(await RideBooking.exists({ rider: profile._id, "paymentInfo.status": "Paid" })) : true;
    const ageDays = profile?.createdAt ? (Date.now() - new Date(profile.createdAt).getTime()) / 86400e3 : 999;
    const rewardedList = mine.filter((m) => m.status === "REWARDED");
    return res.json({
      success: true,
      data: {
        enabled: cfg.enabled,
        code,
        terms: cfg.terms,
        rules: { referrerReward: cfg.referrerReward, joiningBonus: cfg.joiningBonus, linkWindowDays: Math.max(1, cfg.linkWindowDays) },
        stats: {
          rewarded: rewardedList.length,
          pending: mine.filter((m) => PENDING.includes(m.status)).length,
          total: mine.length,
          earned: rewardedList.reduce((n, m) => n + (m.terms?.referrerReward || 0), 0),
        },
        walletBalance: Number(profile?.walletBalance) || 0,
        referrals: mine.map((m) => ({
          _id: m._id,
          name: maskRiderName(names.get(String(m.referredAuthId))),
          status: m.status,
          reward: m.terms?.referrerReward || 0,
          createdAt: m.createdAt,
          rewardedAt: m.rewardedAt,
          rejectReason: m.status === "REJECTED" ? m.rejectReason : undefined,
        })),
        referredBy,
        canEnterCode: cfg.enabled && !linked && !hasPaidRide && ageDays <= Math.max(1, cfg.linkWindowDays),
      },
    });
  } catch (e) {
    console.error("Get rider referral error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/rider/referral/apply  { code, source: email|google|later }
export const applyRiderReferralCode = async (req, res) => {
  try {
    const result = await linkRiderReferral({ referredAuthId: req.riderId, code: req.body?.code, source: req.body?.source });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    const r = result.referral;
    const bonus = r?.terms?.joiningBonus || 0;
    const message =
      r?.status === "REWARDED"
        ? bonus > 0 ? `Referral code added. ₹${bonus} has been added to your MB Wallet!` : "Referral code added."
        : "Referral code added. Your bonus will be added after a quick review.";
    return res.status(201).json({ success: true, message, referrerName: result.referrerName, status: r?.status });
  } catch (e) {
    console.error("Apply rider referral code error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/rider/referral/wallet  -- MB Wallet balance + history
export const getMyRiderWallet = async (req, res) => {
  try {
    const profile = await RiderProfile.findOne({ authId: req.riderId }).select("_id walletBalance").lean();
    if (!profile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const [cfg, txns] = await Promise.all([
      getRiderReferralConfig(),
      RiderWalletTransaction.find({ riderId: profile._id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return res.json({
      success: true,
      data: {
        balance: Number(profile.walletBalance) || 0,
        maxPerRide: cfg.maxWalletPerRide,
        transactions: txns.map((t) => ({ _id: t._id, type: t.type, amount: t.amount, balanceAfter: t.walletBalanceAfter, note: t.note, rideId: t.rideId, createdAt: t.createdAt })),
      },
    });
  } catch (e) {
    console.error("Get rider wallet error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
