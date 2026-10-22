import mongoose from "mongoose";
import RiderAuth from "../models/rider/RiderAuth.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderReferral, { RIDER_REFERRAL_STATUSES } from "../models/rider/RiderReferral.js";
import RiderReferralCode from "../models/rider/RiderReferralCode.js";
import RiderWalletTransaction from "../models/rider/RiderWalletTransaction.js";
import { RiderReferralConfig, RiderReferralConfigHistory, RIDER_REFERRAL_CONFIG_KEY } from "../models/rider/RiderReferralConfig.js";
import { Staff } from "../models/Staff.js";
import {
  getRiderReferralConfig,
  normalizeRiderReferralConfig,
  adminRiderReferralAction,
  ensureRiderReferralCode,
  riderWalletSummary,
} from "../services/riderReferral.service.js";

// Admin: MBGO Referral Program + MB Wallet (/api/admin/rider-referrals).

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

// Name / mobile / email / status / code / wallet for a set of RiderAuth ids.
async function people(authIds) {
  const ids = [...new Set(authIds.map(String))];
  const [profiles, auths, codes] = await Promise.all([
    RiderProfile.find({ authId: { $in: ids } }).select("authId fullName mobileNumber walletBalance").lean(),
    RiderAuth.find({ _id: { $in: ids } }).select("email status").lean(),
    RiderReferralCode.find({ authId: { $in: ids } }).select("authId code").lean(),
  ]);
  const map = new Map();
  for (const a of auths) map.set(String(a._id), { authId: a._id, email: a.email, status: a.status });
  for (const c of codes) map.set(String(c.authId), { ...(map.get(String(c.authId)) || {}), code: c.code });
  for (const p of profiles) {
    const k = String(p.authId);
    map.set(k, { ...(map.get(k) || {}), name: p.fullName, mobile: p.mobileNumber, profileId: p._id, walletBalance: p.walletBalance || 0 });
  }
  return map;
}

// GET /summary
export const riderReferralSummary = async (req, res) => {
  try {
    const [cfg, byStatus, wallet, top] = await Promise.all([
      getRiderReferralConfig(),
      RiderReferral.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      riderWalletSummary(),
      RiderReferral.aggregate([
        { $group: { _id: "$referrerAuthId", total: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ["$status", "REWARDED"] }, 1, 0] } } } },
        { $sort: { rewarded: -1, total: -1 } },
        { $limit: 15 },
      ]),
    ]);
    const counts = Object.fromEntries(RIDER_REFERRAL_STATUSES.map((s) => [s, 0]));
    for (const b of byStatus) counts[b._id] = b.n;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const who = await people(top.map((t) => t._id));
    return res.json({
      success: true,
      data: {
        config: cfg,
        counts,
        total,
        approvalRate: total ? Math.round((counts.REWARDED / total) * 100) : 0,
        wallet,
        topReferrers: top.map((t) => {
          const p = who.get(String(t._id)) || {};
          return { authId: t._id, name: p.name || p.email || "—", mobile: p.mobile, code: p.code, total: t.total, rewarded: t.rewarded, walletBalance: p.walletBalance || 0 };
        }),
      },
    });
  } catch (e) {
    return fail(res, e, "Rider referral summary");
  }
};

// GET /?status=&q=&from=&to=&referrer=&format=csv
export const listRiderReferrals = async (req, res) => {
  try {
    const filter = {};
    if (RIDER_REFERRAL_STATUSES.includes(req.query.status)) filter.status = req.query.status;
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
      const [ps, as, cs] = await Promise.all([
        RiderProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("authId").limit(300).lean(),
        RiderAuth.find({ email: rx }).select("_id").limit(300).lean(),
        RiderReferralCode.find({ code: rx }).select("authId").limit(300).lean(),
      ]);
      const ids = [...ps.map((p) => p.authId), ...as.map((a) => a._id), ...cs.map((c) => c.authId)];
      filter.$or = [{ code: rx }, { referrerAuthId: { $in: ids } }, { referredAuthId: { $in: ids } }];
    }
    const csv = req.query.format === "csv";
    const items = await RiderReferral.find(filter).sort({ createdAt: -1 }).limit(csv ? 10000 : 300).lean();
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
        referrer: { authId: i.referrerAuthId, name: a.name || "", mobile: a.mobile || "", email: a.email || "", status: a.status },
        referred: { authId: i.referredAuthId, name: b.name || "", mobile: b.mobile || "", email: b.email || "", status: b.status },
      };
    });
    if (csv) {
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const head = ["Referral ID", "Code", "Status", "Source", "Linked on", "Rewarded on", "Referrer", "Referrer mobile", "Referrer email", "New rider", "New rider mobile", "New rider email", "Referrer reward", "Joining bonus", "Flags"];
      const lines = rows.map((r) =>
        [r._id, r.code, r.status, r.source, r.createdAt?.toISOString?.(), r.rewardedAt?.toISOString?.() || "", r.referrer.name, r.referrer.mobile, r.referrer.email, r.referred.name, r.referred.mobile, r.referred.email, r.terms?.referrerReward, r.terms?.joiningBonus, r.flags.map((f) => f.label).join("; ")]
          .map(cell)
          .join(",")
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mbgo-referrals-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send([head.map(cell).join(","), ...lines].join("\n"));
    }
    return res.json({ success: true, data: rows });
  } catch (e) {
    return fail(res, e, "List rider referrals");
  }
};

// GET /:id
export const getRiderReferral = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const r = await RiderReferral.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ success: false, message: "Not found" });
    const [who, entries] = await Promise.all([
      people([r.referrerAuthId, r.referredAuthId]),
      RiderWalletTransaction.find({ referralId: r._id }).sort({ createdAt: 1 }).lean(),
    ]);
    return res.json({ success: true, data: { ...r, referrer: who.get(String(r.referrerAuthId)) || {}, referred: who.get(String(r.referredAuthId)) || {}, ledger: entries } });
  } catch (e) {
    return fail(res, e, "Get rider referral");
  }
};

// PATCH /:id  { action: APPROVE_REVIEW|REJECT|REVERSE|EXTEND, note, days }
export const actOnRiderReferral = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const result = await adminRiderReferralAction(req.params.id, req.body || {}, await staffOf(req));
    if (result.error) return res.status(result.code || 400).json({ success: false, message: result.error });
    return res.json({ success: true, data: result.referral });
  } catch (e) {
    return fail(res, e, "Rider referral action");
  }
};

// GET /riders?q=&page=&limit=  -- every rider with code, referrals and wallet
export const listRiderCodes = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter = {};
    const q = String(req.query.q || "").trim();
    if (q) {
      const rx = new RegExp(esc(q), "i");
      const [ps, cs] = await Promise.all([
        RiderProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("authId").limit(500).lean(),
        RiderReferralCode.find({ code: rx }).select("authId").limit(500).lean(),
      ]);
      filter.$or = [{ email: rx }, { _id: { $in: [...ps.map((p) => p.authId), ...cs.map((c) => c.authId)] } }];
    }
    const [total, auths] = await Promise.all([
      RiderAuth.countDocuments(filter),
      RiderAuth.find(filter).select("email status createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    const ids = auths.map((a) => a._id);
    const codeOf = new Map();
    for (const a of auths) codeOf.set(String(a._id), await ensureRiderReferralCode(a._id)); // same generator as the app
    const [profiles, made, linked] = await Promise.all([
      RiderProfile.find({ authId: { $in: ids } }).select("authId fullName mobileNumber walletBalance").lean(),
      RiderReferral.aggregate([
        { $match: { referrerAuthId: { $in: ids } } },
        { $group: { _id: "$referrerAuthId", total: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ["$status", "REWARDED"] }, 1, 0] } } } },
      ]),
      RiderReferral.find({ referredAuthId: { $in: ids } }).select("referredAuthId referrerAuthId code status").lean(),
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
        profileId: p._id,
        name: p.fullName || "",
        mobile: p.mobileNumber || "",
        email: a.email,
        status: a.status,
        joinedAt: a.createdAt,
        code: codeOf.get(String(a._id)),
        referrals: c.total || 0,
        rewarded: c.rewarded || 0,
        walletBalance: p.walletBalance || 0,
        referredBy: l ? { code: l.code, status: l.status, name: referrers.get(String(l.referrerAuthId))?.name || "" } : null,
      };
    });
    return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    return fail(res, e, "List rider codes");
  }
};

// GET /rider/:authId/wallet  -- one rider's MB Wallet history
export const getRiderWalletHistory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.authId)) return res.status(404).json({ success: false, message: "Not found" });
    const profile = await RiderProfile.findOne({ authId: req.params.authId }).select("_id fullName walletBalance").lean();
    if (!profile) return res.status(404).json({ success: false, message: "Rider not found" });
    const txns = await RiderWalletTransaction.find({ riderId: profile._id }).sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, data: { name: profile.fullName, balance: profile.walletBalance || 0, transactions: txns } });
  } catch (e) {
    return fail(res, e, "Rider wallet history");
  }
};

// GET /config
export const getRiderReferralSettings = async (req, res) => {
  try {
    const history = await RiderReferralConfigHistory.find().sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, data: await getRiderReferralConfig(), history });
  } catch (e) {
    return fail(res, e, "Get rider referral settings");
  }
};

// PUT /config
export const updateRiderReferralSettings = async (req, res) => {
  try {
    const b = req.body || {};
    const before = await getRiderReferralConfig();
    const set = {};
    if (b.enabled !== undefined) set.enabled = !!b.enabled;
    for (const [k, min] of [["referrerReward", 0], ["joiningBonus", 0], ["expiryDays", 1], ["dailyLimit", 1], ["linkWindowDays", 0], ["maxWalletPerRide", 0]]) {
      if (b[k] === undefined) continue;
      const n = Number(b[k]);
      if (!Number.isFinite(n) || n < min) return res.status(400).json({ success: false, message: `${k} must be ${min} or more` });
      if (n > 100000) return res.status(400).json({ success: false, message: `${k} is too large` });
      set[k] = ["expiryDays", "dailyLimit", "linkWindowDays"].includes(k) ? Math.round(n) : Math.round(n * 100) / 100;
    }
    if (b.terms !== undefined) set.terms = String(b.terms).slice(0, 4000);
    const changes = Object.entries(set)
      .filter(([k, v]) => before[k] !== v)
      .map(([field, to]) => ({ field, from: before[field], to }));
    const doc = await RiderReferralConfig.findOneAndUpdate({ key: RIDER_REFERRAL_CONFIG_KEY }, { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    if (changes.length) {
      const staff = await staffOf(req);
      await RiderReferralConfigHistory.create({ changes, changedById: staff.id, changedBy: staff.name });
    }
    return res.json({ success: true, data: normalizeRiderReferralConfig(doc) });
  } catch (e) {
    return fail(res, e, "Update rider referral settings");
  }
};
