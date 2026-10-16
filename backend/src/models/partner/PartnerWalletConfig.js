import mongoose from "mongoose";

// MBConnect "Partner Wallet" program settings (one document, key "default").
// While `enabled` is false nothing changes anywhere: accepting, earnings,
// commission and cancellations work exactly as before.
export const PARTNER_WALLET_CONFIG_KEY = "default";

const partnerWalletConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: PARTNER_WALLET_CONFIG_KEY },
    enabled: { type: Boolean, default: false },
    firstRechargeMin: { type: Number, default: 1000, min: 0 }, // ₹ -- first top-up must be at least this
    minRecharge: { type: Number, default: 100, min: 1 }, // ₹ -- later top-ups
    maxRecharge: { type: Number, default: 50000, min: 1 }, // ₹ -- per top-up
    minBalance: { type: Number, default: 300, min: 0 }, // ₹ -- must stay available after reserving a trip fee
    feePerKm: { type: Number, default: 1, min: 0 }, // ₹ per booked km, taken instead of commission
    cancellation: {
      freeMinutes: { type: Number, default: 5, min: 0 }, // after accepting
      regularWithin24h: { type: Number, default: 50, min: 0 }, // ₹ flat, city rides
      regularAfter24h: { type: Number, default: 100, min: 0 }, // ₹ flat, city rides
      outstationFreeDays: { type: Number, default: 7, min: 0 }, // more than this many days before pickup -> ₹0
      outstationMidPerKm: { type: Number, default: 0.5, min: 0 }, // 24h .. freeDays before pickup
      outstationLatePerKm: { type: Number, default: 1.5, min: 0 }, // within 24h of pickup
    },
  },
  { timestamps: true }
);

export const PartnerWalletConfig =
  mongoose.models.PartnerWalletConfig || mongoose.model("PartnerWalletConfig", partnerWalletConfigSchema);
