import mongoose from "mongoose";

// MBGo rider app: "Important Update" -- one line on Home, full message in the
// rider's Notifications (fanned out as per-rider Notification records).
const appAnnouncementSchema = new mongoose.Schema(
  {
    headline: { type: String, trim: true, maxlength: 90, required: true },
    message: { type: String, trim: true, maxlength: 1000, required: true },
    isActive: { type: Boolean, default: true, index: true },
    startAt: { type: Date },
    endAt: { type: Date },
    sendPush: { type: Boolean, default: false },
    // Set once when it's delivered to riders' notifications (never re-sent).
    delivery: {
      status: { type: String, enum: ["PENDING", "SENDING", "SENT", "FAILED"], default: "PENDING" },
      notified: { type: Number, default: 0 },
      pushed: { type: Number, default: 0 },
      sentAt: Date,
      error: String,
    },
  },
  { timestamps: true }
);

export const AppAnnouncement = mongoose.model("AppAnnouncement", appAnnouncementSchema);
