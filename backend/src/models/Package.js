import mongoose from "mongoose";
import slugify from "slugify";

const packageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    slug: { type: String, unique: true, index: true },

    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },

    coverImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    gallery: [
      {
        url: String,
        alt: String,
        public_id: String,
        width: Number,
        height: Number,
      },
    ],
    duration: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },
    batch: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reviews",
      },
    ],
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: {
      type: String,
    },
    mainCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    otherCategory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    schemaType: {
      type: String,
    },
    maxPeople: Number,
    highlights: [String],
    inclusions: [String],
    exclusions: [String],
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    itinerary: [
      {
        title: { type: String },
        description: { type: String },
      },
    ],
    itineraryDownload: {
      url: String,
      public_id: String,
      alt: String,
    },
    isBestSeller: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

packageSchema.pre("save", function (next) {
  if (this.isModified("slug")) {
    this.slug = slugify(this.slug ? this.slug : this.title, {
      lower: true,
      strict: true,
    });
  }
  next();
});

packageSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.slug) {
    update.slug = slugify(update.slug || update.title, {
      lower: true,
      strict: true,
    });
    this.setUpdate(update);
  }
  next();
});

export const Package = mongoose.model("Package", packageSchema);
