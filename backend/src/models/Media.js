import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
    },
    alt: String,
    title: String,
    description: String,
    public_id: { type: String },
    format: String,
    resource_type: String,
    width: Number,
    height: Number,
    pages: Number,
    folder: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Media = mongoose.model("Media", mediaSchema);
