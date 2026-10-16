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
  },
  { timestamps: true }
);

export default mongoose.models.PartnerWalletTransaction ||
  mongoose.model("PartnerWalletTransaction", partnerWalletTransactionSchema);
