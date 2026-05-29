import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    years: {
      type: Number,
      default: 0,
    },
    months: {
      type: Number,
      default: 0,
    },
    days: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const VisaDuration = mongoose.model("VisaDuration", schema, "visa_duration");
