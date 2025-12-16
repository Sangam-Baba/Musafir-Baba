import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    media: {
      url: String,
      public_id: String,
      format: String,
      resource_type: String,
      width: Number,
      height: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    related: {
      type: String,
      enum: ["Tour", "Visa"],
      default: "Tour",
    },
  },
  { timestamps: true }
);

export const Document = mongoose.model("Document", documentSchema);
