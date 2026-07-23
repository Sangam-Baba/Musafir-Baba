import mongoose from "mongoose";

const partnerActionLogSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerAuth",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      // Optional, as automated actions might not have an admin
    },
    actionType: {
      type: String,
      enum: ["StatusChange", "Comment", "SystemUpdate"],
      required: true,
    },
    oldStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    reasons: [
      {
        type: String,
      }
    ],
    comment: {
      type: String,
    }
  },
  { timestamps: true }
);

export default mongoose.models.PartnerActionLog ||
  mongoose.model("PartnerActionLog", partnerActionLogSchema);
