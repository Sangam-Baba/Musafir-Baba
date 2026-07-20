import mongoose from "mongoose";

export const socialSchema = new mongoose.Schema(
  {
    openGraph: {
      title: { type: String, maxlength: 400 },
      description: { type: String, maxlength: 600 },
      image: { type: String },
      imageAlt: { type: String },
      type: {
        type: String,
        enum: [
          "website",
          "article",
          "product",
          "profile",
          "book",
          "music.song",
          "video.movie",
        ],
      },
    },
    twitter: {
      inheritOpenGraph: { type: Boolean, default: true },
      title: { type: String, maxlength: 400 },
      description: { type: String, maxlength: 600 },
      image: { type: String },
      card: {
        type: String,
        enum: ["summary", "summary_large_image", "app", "player"],
        default: "summary_large_image"
      },
    },
  },
  { _id: false },
);
