import mongoose from "mongoose";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import DriverCancellation from "../models/partner/DriverCancellation.js";
import { PartnerWalletConfig, PARTNER_WALLET_CONFIG_KEY } from "../models/partner/PartnerWalletConfig.js";
import { Staff } from "../models/Staff.js";
import { notifyUser } from "../services/notification/notificationService.js";
import { getWalletConfig, normalizeConfig, creditWallet, debitWallet, DEFAULT_WALLET_CONFIG } from "../services/partnerWallet.service.js";

// Admin: MBConnect Partner Wallet program (/api/admin/partner-wallet-program).

const staffName = async (req) => {
  try {
    return (await Staff.findById(req.user?.sub).select("name").lean())?.name || "Admin";
  } catch {
    return "Admin";
  }
};
const badId = (id) => !mongoose.isValidObjectId(id);
const fail = (res, e, label) => {
  console.error(`${label} error:`, e.message);
  return res.status(500).json({ success: false, message: "Server Error" });
};

// Validates the editable settings; returns { value } or { error }.
export function cleanWalletConfig(body = {}) {
  const d = DEFAULT_WALLET_CONFIG;
  const out = {};
  if (body.enabled !== undefined) out.enabled = !!body.enabled;
  for (const k of ["firstRechargeMin", "minRecharge", "maxRecharge", "minBalance", "feePerKm"]) {
    if (body[k] === undefined) continue;
    const n = Number(body[k]);
    if (!Number.isFinite(n) || n < 0) return { error: `${k} must be a number of 0 or more` };
    out[k] = n;
  }
  if (out.minRecharge !== undefined && out.minRecharge < 1) return { error: "Minimum recharge must be at least ₹1" };
  if (body.cancellation) {
    for (const k of Object.keys(d.cancellation)) {
      if (body.cancellation[k] === undefined) continue;
      const n = Number(body.cancellation[k]);
      if (!Number.isFinite(n) || n < 0) return { error: `cancellation.${k} must be a number of 0 or more` };
      out[`cancellation.${k}`] = n;
    }
  }
  return { value: out };
}

// GET /config
export const getWalletProgramConfig = async (req, res) => {
  try {
    return res.json({ success: true, data: await getWalletConfig() });
  } catch (e) {
    return fail(res, e, "Get wallet config");
  }
};

// PUT /config
export const updateWalletProgramConfig = async (req, res) => {
  try {
    const { value, error } = cleanWalletConfig(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const merged = { ...(await getWalletConfig()), ...Object.fromEntries(Object.entries(value).filter(([k]) => !k.includes("."))) };
    if (merged.maxRecharge < Math.max(merged.firstRechargeMin, merged.minRecharge)) {
      return res.status(400).json({ success: false, message: "Maximum recharge must be at least the minimum recharge amounts" });
    }
    const doc = await PartnerWalletConfig.findOneAndUpdate({ key: PARTNER_WALLET_CONFIG_KEY }, { $set: value }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return res.json({ success: true, data: normalizeConfig(doc) });
  } catch (e) {
    return fail(res, e, "Update wallet config");
  }
};

// Driver balances, history and manual credit/debit live on the Partner Wallets
// admin page (adminPartnerWallet.controller.js) — one wallet per driver.

// GET /cancellations?status=
export const listDriverCancellations = async (req, res) => {
  try {
    const filter = {};
    if (["FREE", "CHARGED", "REVIEW", "WAIVED"].includes(req.query.status)) filter.status = req.query.status;
    const items = await DriverCancellation.find(filter).populate("partnerId", "fullName mobileNumber").sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: items });
  } catch (e) {
    return fail(res, e, "List driver cancellations");
  }
};

// PATCH /cancellations/:id  { action: WAIVE|CHARGE|DISMISS, note }
//   WAIVE   CHARGED -> WAIVED (charge refunded)
//   CHARGE  REVIEW  -> CHARGED (charge taken now)
//   DISMISS REVIEW  -> WAIVED (no charge)
export const decideDriverCancellation = async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const { action } = req.body || {};
    const note = String(req.body?.note || "").trim().slice(0, 300);
    const from = { WAIVE: "CHARGED", CHARGE: "REVIEW", DISMISS: "REVIEW" }[action];
    if (!from) return res.status(400).json({ success: false, message: "Invalid action" });
    const name = await staffName(req);
    const to = action === "CHARGE" ? "CHARGED" : "WAIVED";
    // Atomic state change so a double click can't refund/charge twice.
    const record = await DriverCancellation.findOneAndUpdate(
      { _id: req.params.id, status: from },
      { $set: { status: to, decidedBy: name, decidedAt: new Date(), adminNote: note } },
      { new: true }
    );
    if (!record) return res.status(409).json({ success: false, message: "This cancellation was already decided" });
    const extra = { rideId: record.rideId, note: `${record.rideCode || "Trip"}: ${note || action.toLowerCase()}`, adminId: req.user?.sub, adminName: name };
    if (action === "WAIVE" && record.chargedAmount > 0) {
      await creditWallet(record.partnerId, record.chargedAmount, "cancel_charge_refund", extra);
    }
    if (action === "CHARGE" && record.charge > 0) {
      await debitWallet(record.partnerId, record.charge, "cancel_charge", extra);
      await DriverCancellation.updateOne({ _id: record._id }, { $set: { chargedAmount: record.charge } });
    }
    if (action !== "DISMISS") {
      const partner = await PartnerProfile.findById(record.partnerId).select("pushToken").lean();
      notifyUser({
        recipientType: "Partner",
        recipientId: record.partnerId,
        title: action === "WAIVE" ? "Cancellation charge waived" : "Cancellation charge applied",
        message:
          action === "WAIVE"
            ? `₹${record.chargedAmount} for ${record.rideCode} has been returned to your wallet.`
            : `₹${record.charge} cancellation charge for ${record.rideCode} was taken from your wallet after review.`,
        type: "Payout",
        data: { screen: "PartnerWallet" },
        pushToken: partner?.pushToken,
      }).catch(() => {});
    }
    return res.json({ success: true, data: await DriverCancellation.findById(record._id).lean() });
  } catch (e) {
    return fail(res, e, "Decide driver cancellation");
  }
};
