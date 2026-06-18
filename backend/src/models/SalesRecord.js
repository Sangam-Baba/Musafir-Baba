import mongoose from "mongoose";

const salesRecordSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    clientPhone: {
      type: String,
      required: true,
    },
    packageName: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    itinerary: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    rejectedAt: {
      type: Date,
    },
    adminRemark: {
      type: String,
    },
  },
  { timestamps: true }
);

export const SalesRecord = mongoose.model("SalesRecord", salesRecordSchema);
