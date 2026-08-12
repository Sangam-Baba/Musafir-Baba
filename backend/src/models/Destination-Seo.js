import mongoose from "mongoose";
import { socialSchema } from "./socialSchema.js";

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
    excerpt: {
      type: String,
    },
    content: {
      type: String,
    },
    // On-page Hero heading; falls back to the URL-derived title when unset
    pageTitle: {
      type: String,
    },
    coverImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    social: {
      type: socialSchema,
      default: () => ({ twitter: { inheritOpenGraph: true } }),
    },
    schemaType: [
      {
        type: String,
        enum: [
          "Collection",
          "FAQ",
          "Blog",
          "News",
          "Webpage",
          "Product",
          "Organization",
          "Review",
          "Breadcrumb",
        ],
      },
    ],
    keywords: [String],
  },
  { timestamps: true }
);

export const DestinationSeo = mongoose.model(
  "DestinationSeo",
  destinationSeoSchema
);
