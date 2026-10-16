import mongoose from "mongoose";

// A driver cancelling a ride they had accepted (MBConnect).
//   FREE     -- no charge applied by the rules
//   CHARGED  -- charge taken from the recharge wallet
//   REVIEW   -- exempt-type reason (rider asked, emergency...): not charged, admin decides
//   WAIVED   -- admin refunded / cleared the charge
const driverCancellationSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "RideBooking", required: true, index: true },
    rideCode: { type: String },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerProfile", required: true, index: true },
    reasonKey: { type: String, required: true },
    reasonLabel: { type: String },
    comment: { type: String, trim: true, maxlength: 500 },
    rule: { type: String }, // which slab applied, e.g. "Within 24h of pickup (₹1.5/km)"
    charge: { type: Number, default: 0 }, // computed by the rules
    chargedAmount: { type: Number, default: 0 }, // actually taken from the wallet
    status: { type: String, enum: ["FREE", "CHARGED", "REVIEW", "WAIVED"], required: true, index: true },
    rideStatusAtCancel: { type: String },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    adminNote: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.DriverCancellation || mongoose.model("DriverCancellation", driverCancellationSchema);
