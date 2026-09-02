import PartnerAuth from "../../models/partner/PartnerAuth.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerWalletTransaction from "../../models/partner/PartnerWalletTransaction.js";
import { Staff } from "../../models/Staff.js";
import { notifyUser } from "../../services/notification/notificationService.js";

async function resolveAdminName(req) {
  if (req.user?.name) return req.user.name;
  if (req.user?.sub) {
    const staff = await Staff.findById(req.user.sub).select("name");
    if (staff) return staff.name;
  }
  return "Admin";
}

// @route   GET /api/admin/partner-wallets
// @desc    List partners with their wallet balances (search by name/email/mobile)
export const getPartnerWallets = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const profileFilter = {};
    if (search) {
      profileFilter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const totalProfiles = await PartnerProfile.countDocuments(profileFilter);
    const profiles = await PartnerProfile.find(profileFilter)
      .select("authId fullName mobileNumber walletBalance pendingWalletBalance")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const authIds = profiles.map((p) => p.authId);
    const auths = await PartnerAuth.find({ _id: { $in: authIds } }).select("email status");
    const authById = new Map(auths.map((a) => [String(a._id), a]));

    const wallets = profiles.map((p) => ({
      partnerId: p._id,
      authId: p.authId,
      fullName: p.fullName,
      mobileNumber: p.mobileNumber,
      email: authById.get(String(p.authId))?.email || "",
      status: authById.get(String(p.authId))?.status || "",
      walletBalance: p.walletBalance || 0,
      pendingWalletBalance: p.pendingWalletBalance || 0,
    }));

    return res.status(200).json({
      success: true,
      data: wallets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalProfiles,
        pages: Math.ceil(totalProfiles / limitNum),
      },
    });
  } catch (error) {
    console.error("Get Partner Wallets Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/partner-wallets/:partnerId
// @desc    Single partner's wallet detail + transaction history
export const getPartnerWalletDetail = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const profile = await PartnerProfile.findById(partnerId).select(
      "authId fullName mobileNumber walletBalance pendingWalletBalance"
    );
    if (!profile) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }
    const auth = await PartnerAuth.findById(profile.authId).select("email status");

    const transactions = await PartnerWalletTransaction.find({ partnerId: profile.authId })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: {
        partnerId: profile._id,
        authId: profile.authId,
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber,
        email: auth?.email || "",
        status: auth?.status || "",
        walletBalance: profile.walletBalance || 0,
        pendingWalletBalance: profile.pendingWalletBalance || 0,
        transactions,
      },
    });
  } catch (error) {
    console.error("Get Partner Wallet Detail Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/partner-wallets/:partnerId/release
// @desc    Move some or all of a partner's pendingWalletBalance into walletBalance
export const releasePendingFunds = async (req, res) => {
  try {
    const { partnerId } = req.params;
    let { amount } = req.body;

    const profile = await PartnerProfile.findById(partnerId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }

    const pending = profile.pendingWalletBalance || 0;
    if (amount === undefined || amount === null) amount = pending;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid release amount is required." });
    }
    if (amount > pending) {
      return res.status(400).json({ success: false, message: "Release amount exceeds pending balance." });
    }

    profile.pendingWalletBalance = pending - amount;
    profile.walletBalance = (profile.walletBalance || 0) + amount;
    await profile.save();

    const adminName = await resolveAdminName(req);
    await PartnerWalletTransaction.create({
      partnerId: profile.authId,
      type: "admin_release",
      amount,
      walletBalanceAfter: profile.walletBalance,
      pendingWalletBalanceAfter: profile.pendingWalletBalance,
      adminId: req.user?.sub,
      adminName,
      note: `Released by ${adminName}`,
    });

    await notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title: "Wallet balance updated",
      message: `₹${amount.toLocaleString("en-IN")} has been added to your available wallet balance.`,
      type: "Trip",
      sendPush: false,
    });

    return res.status(200).json({
      success: true,
      walletBalance: profile.walletBalance,
      pendingWalletBalance: profile.pendingWalletBalance,
      message: "Pending balance released successfully.",
    });
  } catch (error) {
    console.error("Release Pending Funds Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/partner-wallets/:partnerId/adjust
// @desc    Manually credit or debit a partner's spendable walletBalance
export const adjustWalletBalance = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { amount, direction, reason } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required." });
    }
    if (!["credit", "debit"].includes(direction)) {
      return res.status(400).json({ success: false, message: "Direction must be 'credit' or 'debit'." });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "A reason is required for manual adjustments." });
    }

    const profile = await PartnerProfile.findById(partnerId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }

    const current = profile.walletBalance || 0;
    if (direction === "debit" && amount > current) {
      return res.status(400).json({ success: false, message: "Debit amount exceeds available balance." });
    }

    profile.walletBalance = direction === "credit" ? current + amount : current - amount;
    await profile.save();

    const adminName = await resolveAdminName(req);
    await PartnerWalletTransaction.create({
      partnerId: profile.authId,
      type: direction === "credit" ? "admin_credit" : "admin_debit",
      amount,
      walletBalanceAfter: profile.walletBalance,
      pendingWalletBalanceAfter: profile.pendingWalletBalance || 0,
      adminId: req.user?.sub,
      adminName,
      note: reason.trim(),
    });

    await notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title: direction === "credit" ? "Wallet credited" : "Wallet debited",
      message: `₹${amount.toLocaleString("en-IN")} has been ${direction === "credit" ? "added to" : "deducted from"} your wallet balance. Reason: ${reason.trim()}`,
      type: "Trip",
      sendPush: false,
    });

    return res.status(200).json({
      success: true,
      walletBalance: profile.walletBalance,
      pendingWalletBalance: profile.pendingWalletBalance || 0,
      message: "Wallet balance adjusted successfully.",
    });
  } catch (error) {
    console.error("Adjust Wallet Balance Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
