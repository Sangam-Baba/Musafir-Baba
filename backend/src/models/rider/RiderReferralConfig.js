import mongoose from "mongoose";

// MBGO Referral Program settings (one document, key "default").
// While `enabled` is false no new referral can be linked.
export const RIDER_REFERRAL_CONFIG_KEY = "default";

const riderReferralConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: RIDER_REFERRAL_CONFIG_KEY },
    enabled: { type: Boolean, default: false },
    referrerReward: { type: Number, default: 50, min: 0 }, // ₹ to the referrer's wallet
    joiningBonus: { type: Number, default: 50, min: 0 }, // ₹ to the new rider's wallet
    expiryDays: { type: Number, default: 90, min: 1 }, // new rider must verify within this many days of linking
    dailyLimit: { type: Number, default: 10, min: 1 }, // referrals per referrer per day before they go to review
    linkWindowDays: { type: Number, default: 7, min: 0 }, // a code can be added this many days after sign-up (before the first paid ride)
    maxWalletPerRide: { type: Number, default: 0, min: 0 }, // ₹ of wallet usable on one ride (0 = no cap)
    terms: { type: String, default: "" },
  },
  { timestamps: true }
);

export const RiderReferralConfig =
  mongoose.models.RiderReferralConfig || mongoose.model("RiderReferralConfig", riderReferralConfigSchema);

// Every settings change: who, when, old -> new.
const riderReferralConfigHistorySchema = new mongoose.Schema(
  {
    changes: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed, _id: false }],
    changedById: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    changedBy: { type: String },
  },
  { timestamps: true }
);

export const RiderReferralConfigHistory =
  mongoose.models.RiderReferralConfigHistory || mongoose.model("RiderReferralConfigHistory", riderReferralConfigHistorySchema);
