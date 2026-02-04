import mongoose from "mongoose";

const popupSchema = new mongoose.Schema(
  {
    button: {
      title: String,
      url: String,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
    },
    coverImage: {
      url: String,
      alt: String,
      width: Number,
      height: Number,
    },
    page: {
      type: String,
      enum: ["home", "webpage"],
      default: "home",
      index: true,
    },
  },
  { timestamps: true },
);

export const Popup = mongoose.model("Popup", popupSchema);
