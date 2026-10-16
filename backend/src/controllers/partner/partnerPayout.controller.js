import crypto from "crypto";
import mongoose from "mongoose";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerPayoutRequest from "../../models/partner/PartnerPayoutRequest.js";
import { Staff } from "../../models/Staff.js";
import { notifyUser } from "../../services/notification/notificationService.js";
import { ledger } from "../../services/partnerWallet.service.js";

// MBConnect withdrawals: wallet -> driver's bank account, transferred manually
// by admin. Flow: REQUESTED -> (PROCESSING) -> PAID | CANCELLED.
// The amount leaves walletBalance at request time so it can't be spent twice;
// a cancellation puts it back. Every status change is a single atomic update.

export const MIN_WITHDRAWAL = 100;
const OPEN = ["REQUESTED", "PROCESSING"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const masked = (acc) => (acc ? `••${String(acc).slice(-4)}` : "");
const newCode = () => `PO-${crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`;
const available = (p) => (Number(p?.walletBalance) || 0) - (Number(p?.walletReserved) || 0);

const forDriver = (r) => ({
  _id: r._id,
  code: r.code,
  amount: r.amount,
  status: r.status,
  bankName: r.bank?.bankName || "",
  accountEnding: masked(r.bank?.accountNumber),
  utr: r.utr || "",
  cancelReason: r.cancelReason || "",
  cancelledBy: r.cancelledBy || "",
  createdAt: r.createdAt,
  processingAt: r.processingAt,
  paidAt: r.paidAt,
  cancelledAt: r.cancelledAt,
});

const tellDriver = (profile, title, message, payout) =>
  notifyUser({
    recipientType: "Partner",
    recipientId: profile._id,
    title,
    message,
    type: "Payout",
    data: { payoutId: String(payout._id), screen: "PayoutHistory" },
    pushToken: profile.pushToken,
  }).catch((e) => console.error("Payout notification error:", e.message));

// Puts a cancelled withdrawal back in the wallet (+ ledger line).
async function refundToWallet(payout, note) {
  const partner = await PartnerProfile.findByIdAndUpdate(payout.partnerId, { $inc: { walletBalance: payout.amount } }, { new: true });
  if (partner) await ledger(partner, "payout_reversed", payout.amount, { note });
  return partner;
}

// ---------------- Driver ----------------

// GET /api/partner/payouts
export const getMyPayouts = async (req, res) => {
  try {
    const profile = await PartnerProfile.findOne({ authId: req.partnerId }).select("walletBalance walletReserved pendingWalletBalance").lean();
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const [bank, items] = await Promise.all([
      PartnerBank.findOne({ partnerId: profile._id, isPrimary: true }).lean(),
      PartnerPayoutRequest.find({ partnerId: profile._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return res.json({
      success: true,
      data: {
        available: Math.max(0, available(profile)),
        pending: Number(profile.pendingWalletBalance) || 0,
        minWithdrawal: MIN_WITHDRAWAL,
        bank: bank
          ? { bankName: bank.bankName, accountHolderName: bank.accountHolderName, accountEnding: masked(bank.accountNumber), ifsc: bank.ifsc, status: bank.status }
          : null,
        hasOpenRequest: items.some((r) => OPEN.includes(r.status)),
        items: items.map(forDriver),
      },
    });
  } catch (error) {
    console.error("Get payouts error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/payouts  { amount }
// (also mounted at the older POST /api/partner/payouts/request)
export const requestWithdrawal = async (req, res) => {
  try {
    const amount = Math.floor(Number(req.body?.amount) || 0);
    if (amount < MIN_WITHDRAWAL) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ${inr(MIN_WITHDRAWAL)}.` });
    }
    const profile = await PartnerProfile.findOne({ authId: req.partnerId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true }).lean();
    if (!bank?.accountNumber || !bank?.ifsc) {
      return res.status(400).json({ success: false, code: "NO_BANK", message: "Add your bank account first (Menu → Payout & Bank Details → Update Bank Info)." });
    }
    if (bank.status === "Rejected") {
      return res.status(400).json({ success: false, code: "NO_BANK", message: "Your bank account was rejected. Update your bank details to withdraw." });
    }
    if (await PartnerPayoutRequest.exists({ partnerId: profile._id, status: { $in: OPEN } })) {
      return res.status(409).json({ success: false, message: "You already have a withdrawal in progress. You can request again once it's completed or cancelled." });
    }

    // Atomic: only if this much is free (money held for accepted trips stays).
    const updated = await PartnerProfile.findOneAndUpdate(
      { _id: profile._id, $expr: { $gte: [{ $subtract: [{ $ifNull: ["$walletBalance", 0] }, { $ifNull: ["$walletReserved", 0] }] }, amount] } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    );
    if (!updated) {
      return res.status(400).json({ success: false, message: `Not enough balance. You can withdraw up to ${inr(Math.max(0, Math.floor(available(profile))))}.` });
    }

    let payout;
    try {
      payout = await PartnerPayoutRequest.create({
        code: newCode(),
        partnerId: profile._id,
        authId: profile.authId,
        amount,
        bank: {
          accountHolderName: bank.accountHolderName,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          ifsc: bank.ifsc,
          upiId: bank.upiId,
          status: bank.status,
        },
      });
    } catch (e) {
      // Couldn't record the request: give the money straight back.
      await PartnerProfile.updateOne({ _id: profile._id }, { $inc: { walletBalance: amount } });
      throw e;
    }
    await ledger(updated, "payout", amount, { note: `Withdrawal ${payout.code} to ${bank.bankName} ${masked(bank.accountNumber)}` });
    tellDriver(updated, "Withdrawal requested", `Your withdrawal of ${inr(amount)} (${payout.code}) to ${bank.bankName} ${masked(bank.accountNumber)} is requested. We'll notify you when it's sent to your bank.`, payout);

    return res.status(201).json({ success: true, message: "Withdrawal requested.", data: forDriver(payout), walletBalance: updated.walletBalance });
  } catch (error) {
    console.error("Request withdrawal error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/payouts/:id/cancel   (only while still REQUESTED)
export const cancelMyWithdrawal = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found." });
    const profile = await PartnerProfile.findOne({ authId: req.partnerId }).select("_id").lean();
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const payout = await PartnerPayoutRequest.findOneAndUpdate(
      { _id: req.params.id, partnerId: profile._id, status: "REQUESTED" },
      { $set: { status: "CANCELLED", cancelledBy: "DRIVER", cancelReason: "Cancelled by you", cancelledAt: new Date() } },
      { new: true }
    );
    if (!payout) return res.status(409).json({ success: false, message: "This withdrawal can't be cancelled now (it may already be processing)." });
    const partner = await refundToWallet(payout, `Withdrawal ${payout.code} cancelled by you`);
    if (partner) tellDriver(partner, "Withdrawal cancelled", `${inr(payout.amount)} from withdrawal ${payout.code} is back in your wallet.`, payout);
    return res.json({ success: true, message: "Withdrawal cancelled. The money is back in your wallet.", data: forDriver(payout) });
  } catch (error) {
    console.error("Cancel withdrawal error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Last few completed bank transfers, in the shape the Earnings screen uses.
export async function recentPaidPayouts(partnerProfileId, limit = 3) {
  const rows = await PartnerPayoutRequest.find({ partnerId: partnerProfileId, status: "PAID" }).sort({ paidAt: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    id: String(r._id),
    amount: r.amount,
    status: "Paid",
    bankName: r.bank?.bankName || "Bank",
    accountEnding: String(r.bank?.accountNumber || "").slice(-4),
    date: new Date(r.paidAt || r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    referenceId: r.utr ? `UTR ${r.utr}` : r.code,
  }));
}

// ---------------- Admin (/api/admin/partner-payouts) ----------------

const adminName = async (req) => {
  if (req.user?.name) return req.user.name;
  try {
    return (await Staff.findById(req.user?.sub).select("name").lean())?.name || "Admin";
  } catch {
    return "Admin";
  }
};

// GET /?status=&search=
export const adminListPayouts = async (req, res) => {
  try {
    const filter = {};
    if (["REQUESTED", "PROCESSING", "PAID", "CANCELLED"].includes(req.query.status)) filter.status = req.query.status;
    else if (req.query.status === "OPEN") filter.status = { $in: OPEN };
    const search = String(req.query.search || "").trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const ids = await PartnerProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("_id").limit(200).lean();
      filter.$or = [{ code: rx }, { utr: rx }, { partnerId: { $in: ids.map((p) => p._id) } }];
    }
    const [items, counts] = await Promise.all([
      PartnerPayoutRequest.find(filter).populate("partnerId", "fullName mobileNumber walletBalance").sort({ createdAt: -1 }).limit(200).lean(),
      PartnerPayoutRequest.aggregate([{ $group: { _id: "$status", n: { $sum: 1 }, amount: { $sum: "$amount" } } }]),
    ]);
    return res.json({ success: true, data: items, counts: Object.fromEntries(counts.map((c) => [c._id, { count: c.n, amount: c.amount }])) });
  } catch (error) {
    console.error("Admin list payouts error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PATCH /:id  { action: PROCESSING | PAID | CANCEL, utr?, note? }
export const adminUpdatePayout = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found." });
    const { action } = req.body || {};
    const note = String(req.body?.note || "").trim().slice(0, 300);
    const utr = String(req.body?.utr || "").trim().slice(0, 40);
    const name = await adminName(req);
    const who = { decidedBy: name, decidedById: req.user?.sub };
    let from, set;
    if (action === "PROCESSING") {
      from = ["REQUESTED"];
      set = { status: "PROCESSING", processingAt: new Date(), ...(note && { adminNote: note }) };
    } else if (action === "PAID") {
      if (utr.length < 4) return res.status(400).json({ success: false, message: "Enter the bank transfer UTR / reference number." });
      from = OPEN;
      set = { status: "PAID", utr, paidAt: new Date(), ...(note && { adminNote: note }) };
    } else if (action === "CANCEL") {
      if (!note) return res.status(400).json({ success: false, message: "Add a reason — the driver will see it." });
      from = OPEN;
      set = { status: "CANCELLED", cancelledBy: "ADMIN", cancelReason: note, cancelledAt: new Date() };
    } else {
      return res.status(400).json({ success: false, message: "Invalid action." });
    }
    // Atomic so a double click can't pay or refund twice.
    const payout = await PartnerPayoutRequest.findOneAndUpdate({ _id: req.params.id, status: { $in: from } }, { $set: { ...set, ...who } }, { new: true });
    if (!payout) return res.status(409).json({ success: false, message: "This withdrawal was already updated. Refresh to see its status." });

    let partner = await PartnerProfile.findById(payout.partnerId).select("pushToken");
    const bankLine = `${payout.bank?.bankName || "your bank"} ${masked(payout.bank?.accountNumber)}`;
    if (action === "PROCESSING") {
      if (partner) tellDriver(partner, "Withdrawal processing", `Your withdrawal of ${inr(payout.amount)} (${payout.code}) is being transferred to ${bankLine}.`, payout);
    } else if (action === "PAID") {
      if (partner) tellDriver(partner, "Money sent to your bank", `${inr(payout.amount)} (${payout.code}) was transferred to ${bankLine}. UTR: ${utr}.`, payout);
    } else {
      partner = await refundToWallet(payout, `Withdrawal ${payout.code} cancelled: ${note}`);
      if (partner) tellDriver(partner, "Withdrawal cancelled", `Withdrawal ${payout.code} was cancelled: ${note}. ${inr(payout.amount)} is back in your wallet.`, payout);
    }
    return res.json({ success: true, data: payout });
  } catch (error) {
    console.error("Admin update payout error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
