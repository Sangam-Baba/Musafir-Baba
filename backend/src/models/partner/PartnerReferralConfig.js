import mongoose from "mongoose";

// MBConnect Referral Program settings (one document, key "default").
// While `enabled` is false no new referral can be linked; existing referrals
// keep the terms they were created with (see PartnerReferral.terms).
export const PARTNER_REFERRAL_CONFIG_KEY = "default";

const partnerReferralConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: PARTNER_REFERRAL_CONFIG_KEY },
    enabled: { type: Boolean, default: false },
    referrerReward: { type: Number, default: 100, min: 0 }, // ₹ to the referrer -- LOCKED until unlockAfter referrals
    joiningBonus: { type: Number, default: 100, min: 0 }, // ₹ to the new driver -- straight to the wallet (not locked)
    unlockAfter: { type: Number, default: 25, min: 1 }, // rewarded referrals needed to unlock the referrer's bonus
    expiryDays: { type: Number, default: 90, min: 1 }, // new driver must be approved within this many days of linking
    dailyLimit: { type: Number, default: 10, min: 1 }, // referrals per referrer per day before they go to review
    terms: { type: String, default: "" }, // shown in the app (Refer & Earn)
  },
  { timestamps: true }
);

export const PartnerReferralConfig =
  mongoose.models.PartnerReferralConfig || mongoose.model("PartnerReferralConfig", partnerReferralConfigSchema);

// Every settings change: who, when, old -> new (admin "Change history").
const partnerReferralConfigHistorySchema = new mongoose.Schema(
  {
    changes: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed, _id: false }],
    changedById: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    changedBy: { type: String },
  },
  { timestamps: true }
);

export const PartnerReferralConfigHistory =
  mongoose.models.PartnerReferralConfigHistory ||
  mongoose.model("PartnerReferralConfigHistory", partnerReferralConfigHistorySchema);
