import mongoose from "mongoose";

const partnerAddressSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
      required: true,
    },
    type: {
      type: String,
      enum: ["Permanent", "Current"],
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    addressLine: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: "India",
    },
    pincode: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Create a 2dsphere index for future proximity searches
partnerAddressSchema.index({ location: "2dsphere" });

export default mongoose.models.PartnerAddress ||
  mongoose.model("PartnerAddress", partnerAddressSchema);
