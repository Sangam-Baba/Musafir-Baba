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
