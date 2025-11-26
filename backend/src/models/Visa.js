import mongoose from "mongoose";
import slugify from "slugify";
const visaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
    },
    excerpt: {
      type: String,
    },
    metaTitle: String,
    metaDescription: String,
    keywords: {
      type: [String],
    },
    bannerImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    country: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    coverImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    duration: {
      type: String,
      trim: true,
    },
    cost: {
      type: Number,
    },
    visaType: {
      type: String,
      enum: ["E-Visa", "DAC", "EVOA", "Sticker", "ETA", "PAR"],
    },
    visaProcessed: {
      type: Number,
    },
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reviews",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    schemaType: String,
    childUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

visaSchema.pre("save", function (next) {
  if (this.isModified("slug")) {
    this.slug = slugify(this.slug || this.title, { lower: true, strict: true });
  }
  next();
});

visaSchema.pre("findOneAndUpdate", function (next) {
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

export const Visa = mongoose.model("Visa", visaSchema);
