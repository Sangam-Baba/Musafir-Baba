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
      enum: ["PendingVerification", "Active", "Suspended", "Deleted"],
      default: "PendingVerification",
    },
    lastLogin: {
      type: Date,
    },
    // Soft delete (admin "Delete rider"). The account and everything linked
    // to it (bookings, documents, wallet) is kept; status "Deleted" blocks
    // login. Email stays reserved.
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    deleteReason: { type: String },
    statusBeforeDelete: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.RiderAuth ||
  mongoose.model("RiderAuth", riderAuthSchema);
