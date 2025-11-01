import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    quad: { type: Number, required: true },
    quadDiscount: { type: Number },
    triple: { type: Number, required: true },
    tripleDiscount: { type: Number },
    double: { type: Number, required: true },
    doubleDiscount: { type: Number },
    child: { type: Number, required: true },
    childDiscount: { type: Number },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled", "rescheduled"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

export const Batch = mongoose.model("Batch", batchSchema);
