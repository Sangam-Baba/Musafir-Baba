import mongoose from "mongoose";

// MBConnect partner app: "Important Update" -- one line on Home, full message
// in every partner's Inbox (fanned out as per-partner Notification records).
// Separate collection from MBGO's AppAnnouncement.
const partnerAppAnnouncementSchema = new mongoose.Schema(
  {
    headline: { type: String, trim: true, maxlength: 90, required: true },
    message: { type: String, trim: true, maxlength: 1000, required: true },
    isActive: { type: Boolean, default: true, index: true },
    startAt: { type: Date },
    endAt: { type: Date },
    sendPush: { type: Boolean, default: false },
    // Set once when it's delivered to partners' Inbox (never re-sent).
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

export const PartnerAppAnnouncement = mongoose.model("PartnerAppAnnouncement", partnerAppAnnouncementSchema);
