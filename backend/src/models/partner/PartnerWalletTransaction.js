import mongoose from "mongoose";

const partnerWalletTransactionSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerAuth",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "trip_pending_credit", // ride completed — added to pendingWalletBalance
        "admin_release", // admin moved funds from pendingWalletBalance to walletBalance
        "admin_credit", // admin manually added to walletBalance
        "admin_debit", // admin manually deducted from walletBalance
        "recharge", // driver recharged via PayU (Partner Wallet program)
        "platform_fee", // per-km platform fee taken on trip completion
        "cancel_charge", // driver cancellation charge
        "cancel_charge_refund", // admin waived a cancellation charge
        "payout", // driver withdrawal to bank requested (money leaves the wallet)
        "payout_reversed", // withdrawal cancelled, money back in the wallet
        "referral_bonus", // referrer reward into the LOCKED referral balance (walletBalance unchanged)
        "referral_reward", // referrer reward straight to the wallet (already unlocked)
        "referral_joining_bonus", // new driver's joining bonus, straight to the wallet
        "referral_unlock", // locked referral balance moved into the wallet
        "referral_reversal", // admin clawback of a referral reward
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    walletBalanceAfter: {
      type: Number,
      required: true,
    },
    pendingWalletBalanceAfter: {
      type: Number,
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RideBooking",
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    adminName: {
      type: String,
    },
    note: {
      type: String,
    },
    txnid: {
      type: String,
    },
    // Referral Program entries only.
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerReferral" },
    referralBalanceAfter: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerWalletTransaction ||
  mongoose.model("PartnerWalletTransaction", partnerWalletTransactionSchema);
