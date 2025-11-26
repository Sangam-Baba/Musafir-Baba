import mongoose from "mongoose";

const reviewsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
    },
    rating: {
      type: Number,
    },
    comment: {
      type: String,
    },
    location: {
      type: String,
    },
    type: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Reviews = mongoose.model("Reviews", reviewsSchema);
