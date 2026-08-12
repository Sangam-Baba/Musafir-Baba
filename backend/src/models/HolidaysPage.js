import mongoose from "mongoose";
import { socialSchema } from "./socialSchema.js";

// Singleton document holding the admin-editable content for the
// /holidays landing page (Hero heading/image, SEO fields, body content).
const holidaysPageSchema = new mongoose.Schema(
  {
    heroTitle: {
      type: String,
    },
    heroImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    content: {
      type: String,
    },
    social: {
      type: socialSchema,
      default: () => ({ twitter: { inheritOpenGraph: true } }),
    },
  },
  { timestamps: true },
);

export const HolidaysPage = mongoose.model("HolidaysPage", holidaysPageSchema);
