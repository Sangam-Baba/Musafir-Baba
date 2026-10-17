import mongoose from "mongoose";
import PartnerAuth from "../models/partner/PartnerAuth.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerReferral, { REFERRAL_STATUSES } from "../models/partner/PartnerReferral.js";
import PartnerWalletTransaction from "../models/partner/PartnerWalletTransaction.js";
import { PartnerReferralConfig, PartnerReferralConfigHistory, PARTNER_REFERRAL_CONFIG_KEY } from "../models/partner/PartnerReferralConfig.js";
import { Staff } from "../models/Staff.js";
import {
  getReferralConfig,
  normalizeReferralConfig,
  adminReferralAction,
  referralReconciliation,
  ensureReferralCode,
} from "../services/partnerReferral.service.js";

// Admin: MBConnect Referral Program (/api/admin/partner-referrals).

const staffOf = async (req) => {
  let name = req.user?.name;
  if (!name) {
    try {
      name = (await Staff.findById(req.user?.sub).select("name").lean())?.name;
    } catch {}
  }
  return { id: mongoose.isValidObjectId(req.user?.sub) ? req.user.sub : undefined, name: name || "Admin" };
};
const fail = (res, e, label) => {
  console.error(`${label} error:`, e.message);
  return res.status(500).json({ success: false, message: "Server Error" });
};
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Name / mobile / email / status for a set of PartnerAuth ids.
async function people(authIds) {
  const ids = [...new Set(authIds.map(String))];
  const [profiles, auths] = await Promise.all([
    PartnerProfile.find({ authId: { $in: ids } }).select("authId fullName mobileNumber referralBalance referralUnlockedAt").lean(),
    PartnerAuth.find({ _id: { $in: ids } }).select("email status referralCode").lean(),
  ]);
  const map = new Map();
  for (const a of auths) map.set(String(a._id), { authId: a._id, email: a.email, status: a.status, code: a.referralCode });
  for (const p of profiles) {
    const k = String(p.authId);
    map.set(k, { ...(map.get(k) || {}), name: p.fullName, mobile: p.mobileNumber, profileId: p._id, lockedBalance: p.referralBalance || 0, unlockedAt: p.referralUnlockedAt });
  }
  return map;
}

// GET /summary
export const referralSummary = async (req, res) => {
  try {
    const cfg = await getReferralConfig();
    const [byStatus, recon, top] = await Promise.all([
      PartnerReferral.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      referralReconciliation(),
      PartnerReferral.aggregate([
        { $group: { _id: "$referrerAuthId", total: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ["$status", "REWARDED"] }, 1, 0] } } } },
        { $sort: { rewarded: -1, total: -1 } },
        { $limit: 15 },
      ]),
    ]);
    const counts = Object.fromEntries(REFERRAL_STATUSES.map((s) => [s, 0]));
    for (const b of byStatus) counts[b._id] = b.n;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const who = await people(top.map((t) => t._id));
    const topReferrers = top.map((t) => {
      const p = who.get(String(t._id)) || {};
      return { authId: t._id, name: p.name || p.email || "—", mobile: p.mobile, code: p.code, total: t.total, rewarded: t.rewarded, lockedBalance: p.lockedBalance || 0, unlocked: !!p.unlockedAt };
    });
    return res.json({
      success: true,
      data: {
        config: cfg,
        counts,
        total,
        approvalRate: total ? Math.round((counts.REWARDED / total) * 100) : 0,
        reconciliation: recon,
        topReferrers,
        nearUnlock: topReferrers.filter((t) => !t.unlocked && t.rewarded >= Math.max(1, cfg.unlockAfter - 5) && t.rewarded < cfg.unlockAfter),
      },
    });
  } catch (e) {
    return fail(res, e, "Referral summary");
  }
};

// GET /?status=&q=&from=&to=&referrer=&format=csv
export const listReferrals = async (req, res) => {
  try {
    const filter = {};
    if (REFERRAL_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.status === "PENDING") filter.status = { $in: ["LINKED", "QUALIFIED"] };
    if (mongoose.isValidObjectId(req.query.referrer)) filter.referrerAuthId = req.query.referrer;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && !isNaN(from)) || (to && !isNaN(to))) {
      filter.createdAt = {};
      if (from && !isNaN(from)) filter.createdAt.$gte = from;
      if (to && !isNaN(to)) filter.createdAt.$lte = new Date(to.getTime() + 86400e3 - 1);
    }
    const q = String(req.query.q || "").trim();
    if (q) {
      const rx = new RegExp(esc(q), "i");
      const [ps, as] = await Promise.all([
        PartnerProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("authId").limit(300).lean(),
        PartnerAuth.find({ $or: [{ email: rx }, { referralCode: rx }] }).select("_id").limit(300).lean(),
      ]);
      const ids = [...ps.map((p) => p.authId), ...as.map((a) => a._id)];
      filter.$or = [{ code: rx }, { referrerAuthId: { $in: ids } }, { referredAuthId: { $in: ids } }];
    }
    const csv = req.query.format === "csv";
    const items = await PartnerReferral.find(filter).sort({ createdAt: -1 }).limit(csv ? 10000 : 300).lean();
    const who = await people(items.flatMap((i) => [i.referrerAuthId, i.referredAuthId]));
    const rows = items.map((i) => {
      const a = who.get(String(i.referrerAuthId)) || {};
      const b = who.get(String(i.referredAuthId)) || {};
      return {
        _id: i._id,
        code: i.code,
        status: i.status,
        source: i.source,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        rewardedAt: i.rewardedAt,
        flags: i.flags || [],
        terms: i.terms,
        referrerPaidTo: i.referrerPaidTo,
        referrer: { authId: i.referrerAuthId, name: a.name || "", mobile: a.mobile || "", email: a.email || "", status: a.status },
        referred: { authId: i.referredAuthId, name: b.name || "", mobile: b.mobile || "", email: b.email || "", status: b.status },
      };
    });
    if (csv) {
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const head = ["Referral ID", "Code", "Status", "Source", "Linked on", "Expires", "Rewarded on", "Referrer", "Referrer mobile", "Referrer email", "New partner", "New partner mobile", "New partner email", "Referrer reward", "Joining bonus", "Referrer paid to", "Flags"];
      const lines = rows.map((r) =>
        [r._id, r.code, r.status, r.source, r.createdAt?.toISOString?.(), r.expiresAt?.toISOString?.(), r.rewardedAt?.toISOString?.() || "", r.referrer.name, r.referrer.mobile, r.referrer.email, r.referred.name, r.referred.mobile, r.referred.email, r.terms?.referrerReward, r.terms?.joiningBonus, r.referrerPaidTo || "", r.flags.map((f) => f.label).join("; ")]
          .map(cell)
          .join(",")
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mbconnect-referrals-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send([head.map(cell).join(","), ...lines].join("\n"));
    }
    return res.json({ success: true, data: rows });
  } catch (e) {
    return fail(res, e, "List referrals");
  }
};

// GET /:id
export const getReferral = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const r = await PartnerReferral.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ success: false, message: "Not found" });
    const [who, entries] = await Promise.all([
      people([r.referrerAuthId, r.referredAuthId]),
      PartnerWalletTransaction.find({ referralId: r._id }).sort({ createdAt: 1 }).lean(),
    ]);
    return res.json({ success: true, data: { ...r, referrer: who.get(String(r.referrerAuthId)) || {}, referred: who.get(String(r.referredAuthId)) || {}, ledger: entries } });
  } catch (e) {
    return fail(res, e, "Get referral");
  }
};

// PATCH /:id  { action: APPROVE_REVIEW|REJECT|REVERSE|EXTEND, note, days }
export const actOnReferral = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const result = await adminReferralAction(req.params.id, req.body || {}, await staffOf(req));
    if (result.error) return res.status(result.code || 400).json({ success: false, message: result.error });
    return res.json({ success: true, data: result.referral });
  } catch (e) {
    return fail(res, e, "Referral action");
  }
};

// GET /partner/:authId  -- one driver's referral profile
export const getPartnerReferralProfile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.authId)) return res.status(404).json({ success: false, message: "Not found" });
    const authId = req.params.authId;
    const [code, linked, made] = await Promise.all([
      ensureReferralCode(authId),
      PartnerReferral.findOne({ referredAuthId: authId }).lean(),
      PartnerReferral.aggregate([{ $match: { referrerAuthId: new mongoose.Types.ObjectId(authId) } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    const who = await people([authId, ...(linked ? [linked.referrerAuthId] : [])]);
    const me = who.get(String(authId)) || {};
    const counts = Object.fromEntries(made.map((m) => [m._id, m.n]));
    return res.json({
      success: true,
      data: {
        code,
        referredBy: linked ? { referralId: linked._id, ...(who.get(String(linked.referrerAuthId)) || {}), status: linked.status } : null,
        counts,
        rewarded: counts.REWARDED || 0,
        lockedBalance: me.lockedBalance || 0,
        unlockedAt: me.unlockedAt || null,
      },
    });
  } catch (e) {
    return fail(res, e, "Partner referral profile");
  }
};

// GET /partners?q=&page=&limit=  -- every partner account with its referral code
// (codes are created here for accounts that don't have one yet).
export const listPartnerCodes = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter = {};
    const q = String(req.query.q || "").trim();
    if (q) {
      const rx = new RegExp(esc(q), "i");
      const ps = await PartnerProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("authId").limit(500).lean();
      filter.$or = [{ email: rx }, { referralCode: rx }, { _id: { $in: ps.map((p) => p.authId) } }];
    }
    const [total, auths] = await Promise.all([
      PartnerAuth.countDocuments(filter),
      PartnerAuth.find(filter).select("email status referralCode createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    // Create missing codes for this page (same generator as the app).
    for (const a of auths) if (!a.referralCode) a.referralCode = await ensureReferralCode(a._id);
    const ids = auths.map((a) => a._id);
    const [profiles, made, linked] = await Promise.all([
      PartnerProfile.find({ authId: { $in: ids } }).select("authId fullName mobileNumber referralBalance referralUnlockedAt").lean(),
      PartnerReferral.aggregate([
        { $match: { referrerAuthId: { $in: ids } } },
        { $group: { _id: "$referrerAuthId", total: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ["$status", "REWARDED"] }, 1, 0] } } } },
      ]),
      PartnerReferral.find({ referredAuthId: { $in: ids } }).select("referredAuthId referrerAuthId code status").lean(),
    ]);
    const prof = new Map(profiles.map((p) => [String(p.authId), p]));
    const counts = new Map(made.map((m) => [String(m._id), m]));
    const by = new Map(linked.map((l) => [String(l.referredAuthId), l]));
    const referrers = await people(linked.map((l) => l.referrerAuthId));
    const data = auths.map((a) => {
      const p = prof.get(String(a._id)) || {};
      const c = counts.get(String(a._id)) || {};
      const l = by.get(String(a._id));
      return {
        authId: a._id,
        name: p.fullName || "",
        mobile: p.mobileNumber || "",
        email: a.email,
        status: a.status,
        joinedAt: a.createdAt,
        code: a.referralCode,
        referrals: c.total || 0,
        rewarded: c.rewarded || 0,
        lockedBalance: p.referralBalance || 0,
        unlocked: !!p.referralUnlockedAt,
        referredBy: l ? { code: l.code, status: l.status, name: referrers.get(String(l.referrerAuthId))?.name || "" } : null,
      };
    });
    return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    return fail(res, e, "List partner codes");
  }
};

// GET /config
export const getReferralSettings = async (req, res) => {
  try {
    const history = await PartnerReferralConfigHistory.find().sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, data: await getReferralConfig(), history });
  } catch (e) {
    return fail(res, e, "Get referral settings");
  }
};

// PUT /config
export const updateReferralSettings = async (req, res) => {
  try {
    const b = req.body || {};
    const before = await getReferralConfig();
    const set = {};
    if (b.enabled !== undefined) set.enabled = !!b.enabled;
    for (const [k, min] of [["referrerReward", 0], ["joiningBonus", 0], ["unlockAfter", 1], ["expiryDays", 1], ["dailyLimit", 1]]) {
      if (b[k] === undefined) continue;
      const n = Number(b[k]);
      if (!Number.isFinite(n) || n < min) return res.status(400).json({ success: false, message: `${k} must be ${min} or more` });
      if (n > 100000) return res.status(400).json({ success: false, message: `${k} is too large` });
      set[k] = ["unlockAfter", "expiryDays", "dailyLimit"].includes(k) ? Math.round(n) : Math.round(n * 100) / 100;
    }
    if (b.terms !== undefined) set.terms = String(b.terms).slice(0, 4000);
    const changes = Object.entries(set)
      .filter(([k, v]) => before[k] !== v)
      .map(([field, to]) => ({ field, from: before[field], to }));
    const doc = await PartnerReferralConfig.findOneAndUpdate({ key: PARTNER_REFERRAL_CONFIG_KEY }, { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    if (changes.length) {
      const staff = await staffOf(req);
      await PartnerReferralConfigHistory.create({ changes, changedById: staff.id, changedBy: staff.name });
    }
    return res.json({ success: true, data: normalizeReferralConfig(doc) });
  } catch (e) {
    return fail(res, e, "Update referral settings");
  }
};
