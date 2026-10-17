import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerReferral from "../../models/partner/PartnerReferral.js";
import {
  getReferralConfig,
  ensureReferralCode,
  findReferrerByCode,
  linkReferral,
  maskName,
} from "../../services/partnerReferral.service.js";
import { isPartnerApproved } from "../../services/partnerAccount.service.js";

// MBConnect Refer & Earn (driver side). Business rules live in
// services/partnerReferral.service.js.

const PENDING = ["LINKED", "QUALIFIED", "IN_REVIEW"];

// ---- Public: check a code before sign-up (Register screen) ----
// Simple per-IP limit so codes can't be guessed in bulk.
const hits = new Map();
const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;
function limited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > LIMIT;
}

// GET /api/partner-referral/validate?code=
export const validateReferralCode = async (req, res) => {
  try {
    if (limited(req.ip || "x")) return res.status(429).json({ success: false, message: "Too many tries. Please wait a few minutes." });
    const cfg = await getReferralConfig();
    if (!cfg.enabled) return res.json({ success: true, valid: false, enabled: false, message: "The referral program isn't active right now." });
    const ref = await findReferrerByCode(req.query.code);
    if (!ref || ["Suspended", "Blacklisted", "Deleted"].includes(ref.status)) {
      return res.json({ success: true, valid: false, enabled: true, message: "This referral code doesn't exist." });
    }
    return res.json({ success: true, valid: true, enabled: true, code: ref.code, referrerName: ref.name, joiningBonus: cfg.joiningBonus });
  } catch (e) {
    console.error("Validate referral code error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---- Signed-in driver ----

// GET /api/partner/referral
export const getMyReferral = async (req, res) => {
  try {
    const authId = req.partnerId;
    const cfg = await getReferralConfig();
    const [code, profile, mine, linked, approved] = await Promise.all([
      ensureReferralCode(authId),
      PartnerProfile.findOne({ authId }).select("referralBalance referralUnlockedAt isSubmittedForApproval").lean(),
      PartnerReferral.find({ referrerAuthId: authId }).sort({ createdAt: -1 }).limit(200).lean(),
      PartnerReferral.findOne({ referredAuthId: authId }).lean(),
      isPartnerApproved(authId),
    ]);
    const names = new Map(
      (await PartnerProfile.find({ authId: { $in: mine.map((m) => m.referredAuthId) } }).select("authId fullName").lean()).map((p) => [String(p.authId), p.fullName])
    );
    const rewarded = mine.filter((m) => m.status === "REWARDED").length;
    let referredBy = null;
    if (linked) {
      const rp = await PartnerProfile.findOne({ authId: linked.referrerAuthId }).select("fullName").lean();
      referredBy = { name: maskName(rp?.fullName), code: linked.code, status: linked.status, joiningBonus: linked.terms?.joiningBonus || 0 };
    }
    return res.json({
      success: true,
      data: {
        enabled: cfg.enabled,
        code,
        terms: cfg.terms,
        rules: { referrerReward: cfg.referrerReward, joiningBonus: cfg.joiningBonus, unlockAfter: cfg.unlockAfter, expiryDays: cfg.expiryDays },
        stats: {
          rewarded,
          pending: mine.filter((m) => PENDING.includes(m.status)).length,
          total: mine.length,
          lockedBalance: Number(profile?.referralBalance) || 0,
          unlocked: !!profile?.referralUnlockedAt,
          unlockedAt: profile?.referralUnlockedAt || null,
        },
        referrals: mine.map((m) => ({
          _id: m._id,
          name: maskName(names.get(String(m.referredAuthId))),
          status: m.status,
          reward: m.terms?.referrerReward || 0,
          createdAt: m.createdAt,
          rewardedAt: m.rewardedAt,
          rejectReason: m.status === "REJECTED" ? m.rejectReason : undefined,
        })),
        referredBy,
        canEnterCode: cfg.enabled && !linked && !approved && !profile?.isSubmittedForApproval,
      },
    });
  } catch (e) {
    console.error("Get referral error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/referral/apply  { code, source: email|google|later }
export const applyReferralCode = async (req, res) => {
  try {
    const result = await linkReferral({ referredAuthId: req.partnerId, code: req.body?.code, source: req.body?.source });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    return res.status(201).json({
      success: true,
      message: `Referral code added. You'll get your joining bonus when your account is approved.`,
      referrerName: result.referrerName,
    });
  } catch (e) {
    console.error("Apply referral code error:", e.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
