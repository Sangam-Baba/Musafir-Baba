import mongoose from "mongoose";

// Each MBGO rider's permanent referral code (created the first time it's
// needed). Kept in its own collection so the RiderAuth schema is untouched.
const riderReferralCodeSchema = new mongoose.Schema(
  {
    authId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderAuth", required: true, unique: true },
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.models.RiderReferralCode || mongoose.model("RiderReferralCode", riderReferralCodeSchema);
