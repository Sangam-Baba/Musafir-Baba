import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: { type: String, required: true },
    loginAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    logoutAt: Date,
    status: {
      type: String,
      enum: ["active", "logout", "expired", "forced"],
      default: "active",
    },
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

export const Session = mongoose.model("Session", SessionSchema);
