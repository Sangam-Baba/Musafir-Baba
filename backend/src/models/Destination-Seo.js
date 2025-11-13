import mongoose from "mongoose";

const destinationSeoSchema = new mongoose.Schema(
  {
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    metaTitle: {
      type: String,
      required: true,
    },
    metaDescription: {
      type: String,
      required: true,
    },
    keywords: [String],
  },
  { timestamps: true }
);

export const DestinationSeo = mongoose.model(
  "DestinationSeo",
  destinationSeoSchema
);
