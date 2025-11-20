import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    count: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

export const Counter = mongoose.model("Counter", counterSchema);
