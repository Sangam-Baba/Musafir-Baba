import mongoose from "mongoose";

const partnerVehicleSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
      required: true,
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerDriver",
    },
    category: {
      type: String,
      required: true,
    },
    seatingCapacity: {
      type: Number,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    vehicleName: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    chassisNumber: {
      type: String,
    },
    engineNumber: {
      type: String,
    },
    manufacturingYear: {
      type: Number,
    },
    color: {
      type: String,
    },
    permitDetails: {
      hasCommercialPermit: { type: Boolean, default: false },
      permitNumber: { type: String },
      permitType: { type: String },
      permitExpiry: { type: Date },
    },
    rcImageUrl: { type: String },
    pucImageUrl: { type: String },
    insuranceFileUrl: { type: String },
    permitFileUrl: { type: String },
    frontImageUrl: { type: String },
    rearImageUrl: { type: String },
    leftSideImageUrl: { type: String },
    rightSideImageUrl: { type: String },
    interiorImageUrl: { type: String },
    otherImageUrl: { type: String },
    features: [
      {
        type: String, // e.g., 'AC', 'GPS', 'Push Back Seats'
      },
    ],
    images: [
      {
        url: { type: String },
        viewType: { type: String }, // e.g., 'Front', 'Interior'
      },
    ],
    status: {
      type: String,
      enum: ["Pending Approval", "Active", "Rejected", "Disabled"],
      default: "Pending Approval",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerVehicle ||
  mongoose.model("PartnerVehicle", partnerVehicleSchema);
