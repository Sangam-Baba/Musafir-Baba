import mongoose from "mongoose";

const riderProfileSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderAuth",
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    // Admin-controlled only -- set via the admin "mark verified" action, which
    // itself is server-side gated on profilePicture + a document (both
    // sides) existing. Never set directly by the rider or by email
    // verification.
    isVerified: {
      type: Boolean,
      default: false,
    },
    pushToken: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.RiderProfile ||
  mongoose.model("RiderProfile", riderProfileSchema);
