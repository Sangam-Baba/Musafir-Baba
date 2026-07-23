import mongoose from "mongoose";

const partnerAuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otpToken: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    refreshToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Draft", "PendingVerification", "Approved", "Hold", "Rejected", "In-Active", "Active", "Suspended", "Blacklisted"],
      default: "Draft",
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerAuth ||
  mongoose.model("PartnerAuth", partnerAuthSchema);
