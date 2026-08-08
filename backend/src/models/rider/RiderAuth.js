import mongoose from "mongoose";

const riderAuthSchema = new mongoose.Schema(
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
      enum: ["PendingVerification", "Active", "Suspended"],
      default: "PendingVerification",
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.RiderAuth ||
  mongoose.model("RiderAuth", riderAuthSchema);
