import mongoose from "mongoose";

const AuthLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventType: {
      type: String,
      enum: ["login", "logout", "force_logout", "session_expired"],
      required: true,
    },
    ip: String,
    userAgent: String,
    sessionId: {
      type: String, // uuid
      required: true,
    },
    success: {
      type: Boolean,
      default: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const AuthLog = mongoose.model("AuthLog", AuthLogSchema);
