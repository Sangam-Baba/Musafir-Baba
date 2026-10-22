import mongoose from "mongoose";

// MBGO Referral Program: one referral = a new rider (referred) who joined with
// another rider's (referrer's) code. Separate from MBConnect's PartnerReferral.
//
//   LINKED -> QUALIFIED (new rider's email verified) -> REWARDED (both paid)
//   LINKED/QUALIFIED -> IN_REVIEW (fraud signal) -> REWARDED | REJECTED (admin)
//   LINKED -> EXPIRED (not verified within terms.expiryDays)
//   REWARDED -> REVERSED (admin clawback)
//
// Money goes straight to RiderProfile.walletBalance (usable on ride bills,
// never withdrawable). Each side has its own credited flag so a retry can
// never pay twice.
export const RIDER_REFERRAL_STATUSES = ["LINKED", "QUALIFIED", "IN_REVIEW", "REWARDED", "REJECTED", "EXPIRED", "REVERSED"];

const riderReferralSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    referrerAuthId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderAuth", required: true, index: true },
    referredAuthId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderAuth", required: true, unique: true },
    source: { type: String, enum: ["email", "google", "later"], default: "email" },
    status: { type: String, enum: RIDER_REFERRAL_STATUSES, default: "LINKED", index: true },
    // Terms frozen when the code was linked.
    terms: { referrerReward: Number, joiningBonus: Number, expiryDays: Number },
    expiresAt: { type: Date, index: true },
    flags: [{ key: String, label: String, _id: false }],
    reviewCleared: { type: Boolean, default: false },
    referrerCredited: { type: Boolean, default: false },
    joineeCredited: { type: Boolean, default: false },
    qualifiedAt: Date,
    rewardedAt: Date,
    rejectedAt: Date,
    rejectReason: String,
    expiredAt: Date,
    reversedAt: Date,
    reverseReason: String,
    timeline: [
      {
        at: { type: Date, default: Date.now },
        action: String,
        note: String,
        by: String, // "SYSTEM" or the staff name
        byId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);
riderReferralSchema.index({ referrerAuthId: 1, createdAt: -1 });

export default mongoose.models.RiderReferral || mongoose.model("RiderReferral", riderReferralSchema);
