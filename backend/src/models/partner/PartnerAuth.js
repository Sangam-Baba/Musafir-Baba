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
    // Recent refresh tokens (one per signed-in device, newest last, max 5) so
    // signing in on a second phone doesn't sign the first one out.
    refreshTokens: { type: [String], default: undefined },
    // Wrong-code counters: after 5 wrong tries the code stops working and a
    // new one must be requested.
    otpAttempts: { type: Number, default: 0 },
    resetPasswordAttempts: { type: Number, default: 0 },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Draft", "PendingVerification", "Approved", "Hold", "Rejected", "In-Active", "Active", "Suspended", "Blacklisted", "Deleted"],
      default: "Draft",
    },
    lastLogin: {
      type: Date,
    },
    // Soft delete (admin "Delete partner"). The account and everything linked
    // to it (rides, wallet history, documents, logs) is kept; status "Deleted"
    // blocks login and removes the partner from dispatch. Email stays reserved.
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    deleteReason: { type: String },
    statusBeforeDelete: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerAuth ||
  mongoose.model("PartnerAuth", partnerAuthSchema);
