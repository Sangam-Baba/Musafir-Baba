import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["Rider", "Partner"],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // refers to RiderProfile._id or PartnerProfile._id depending on recipientType
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      // "Trip"/"System" included to match mbconnect's existing InboxScreen type union
      type: String,
      enum: ["Ride", "Trip", "Payment", "Payout", "Document", "General", "System"],
      default: "General",
    },
    read: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
