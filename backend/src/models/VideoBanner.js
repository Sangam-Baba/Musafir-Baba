import mongoose from "mongoose";

const videoBannerSchema = new mongoose.Schema(
  {
    media: {
      url: String,
      public_id: String,
      alt: String,
      width: Number,
      height: Number,
      format: String,
      thumbnail_url: String,
    },
    title: {
      type: String,
      trim: true,
    },
    description: String,
    link: String,
    type: {
      type: String,
      enum: ["video", "image"],
      default: "video",
    },
    related: {
      type: String,
      enum: ["tour", "visa", "about"],
    },
  },
  { timestamps: true }
);

export const VideoBanner = mongoose.model("VideoBanner", videoBannerSchema);
