import mongoose from "mongoose";
import slugify from "slugify";

const packageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 120, trim: true },
    description: { type: String, required: true },
    slug: { type: String, unique: true, index: true },

    destination: {
      country: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
    },

    coverImage: { type: String, required: true },
    gallery: [String],

    price: {
      adult: { type: Number, required: true },
      child: { type: Number, required: true },
      currency: { type: String, default: "INR" },
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    duration: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },

    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },

    startDates: [Date],
    endDates: [Date],
    maxPeople: Number,

    highlights: [String],
    inclusions: [String],
    exclusions: [String],

    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

packageSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

export const Package = mongoose.model("Package", packageSchema);
