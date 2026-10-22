import mongoose from "mongoose";

// MBGO rider wallet history (RiderProfile.walletBalance). Amount is always
// positive; `type` says the direction:
//   credit: referral_reward, referral_joining_bonus, ride_wallet_refund, admin_credit
//   debit:  ride_wallet_payment, referral_reversal, admin_debit
export const RIDER_WALLET_CREDIT_TYPES = ["referral_reward", "referral_joining_bonus", "ride_wallet_refund", "admin_credit"];
export const RIDER_WALLET_DEBIT_TYPES = ["ride_wallet_payment", "referral_reversal", "admin_debit"];

const riderWalletTransactionSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderProfile", required: true, index: true },
    type: { type: String, enum: [...RIDER_WALLET_CREDIT_TYPES, ...RIDER_WALLET_DEBIT_TYPES], required: true },
    amount: { type: Number, required: true, min: 0 },
    walletBalanceAfter: { type: Number },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderReferral" },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "RideBooking" },
    note: String,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    adminName: String,
  },
  { timestamps: true }
);
riderWalletTransactionSchema.index({ riderId: 1, createdAt: -1 });

export default mongoose.models.RiderWalletTransaction || mongoose.model("RiderWalletTransaction", riderWalletTransactionSchema);
