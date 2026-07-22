import mongoose from "mongoose";

const partnerDriverSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    alternateMobile: {
      type: String,
    },
    aadhaarNumber: {
      type: String,
    },
    licenceNumber: {
      type: String,
      required: true,
    },
    licenceExpiry: {
      type: Date,
    },
    licenceImageUrl: {
      type: String,
    },
    experienceYears: {
      type: Number,
    },
    languagesKnown: [
      {
        type: String,
      },
    ],
    photoUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending", "Rejected"],
      default: "Pending",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerDriver ||
  mongoose.model("PartnerDriver", partnerDriverSchema);
