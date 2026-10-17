import mongoose from "mongoose";

// One referral: a new driver (referred) who joined with another driver's
// (referrer's) code. Lifecycle (every change is atomic and on the timeline):
//
//   LINKED -> QUALIFIED (new driver approved by admin) -> REWARDED (both paid)
//   LINKED/QUALIFIED -> IN_REVIEW (fraud signal) -> REWARDED | REJECTED (admin)
//   LINKED -> EXPIRED (not approved within terms.expiryDays)
//   LINKED/QUALIFIED/IN_REVIEW -> REJECTED (admin)
//   REWARDED -> REVERSED (admin clawback)
//
// Money: referrer's reward goes to PartnerProfile.referralBalance (locked)
// until they have terms.unlockAfter rewarded referrals; the joining bonus
// goes straight to the new driver's walletBalance. Each credit has its own
// flag so a retry can never pay twice.
export const REFERRAL_STATUSES = ["LINKED", "QUALIFIED", "IN_REVIEW", "REWARDED", "REJECTED", "EXPIRED", "REVERSED"];

const partnerReferralSchema = new mongoose.Schema(
  {
    app: { type: String, default: "mbconnect" }, // reserved for MBGO later
    code: { type: String, required: true }, // code that was entered
    referrerAuthId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerAuth", required: true, index: true },
    referredAuthId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerAuth", required: true, unique: true },
    source: { type: String, enum: ["email", "google", "later"], default: "email" },
    status: { type: String, enum: REFERRAL_STATUSES, default: "LINKED", index: true },
    // Terms frozen when the code was linked -- later settings changes never
    // change what this referral was promised.
    terms: {
      referrerReward: Number,
      joiningBonus: Number,
      unlockAfter: Number,
      expiryDays: Number,
    },
    expiresAt: { type: Date, index: true },
    flags: [{ key: String, label: String, _id: false }], // fraud signals
    reviewCleared: { type: Boolean, default: false }, // admin approved it after review: skip fraud checks
    referrerCredited: { type: Boolean, default: false },
    joineeCredited: { type: Boolean, default: false },
    referrerPaidTo: { type: String, enum: ["locked", "wallet"] }, // where the referrer's reward went
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
        action: String, // LINKED, QUALIFIED, FLAGGED, REWARDED, REJECTED, EXPIRED, REVERSED, EXTENDED, WAITING...
        note: String,
        by: String, // "SYSTEM" or the staff name
        byId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

partnerReferralSchema.index({ referrerAuthId: 1, createdAt: -1 });

export default mongoose.models.PartnerReferral || mongoose.model("PartnerReferral", partnerReferralSchema);
