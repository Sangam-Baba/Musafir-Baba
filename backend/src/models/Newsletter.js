import mongoose from "mongoose";

const newsLetterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      index: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "active",
    },
    lastSentAt: Date,
  },
  { timestamps: true }
);

export const Newsletter = mongoose.model("Newsletter", newsLetterSchema);
