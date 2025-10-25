import mongoose from "mongoose";
import slugify from "slugify";
const customizedTourPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    plans: [
      {
        title: { type: String },
        include: { type: String },
        price: { type: Number },
      },
    ],
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
      days: { type: Number },
      nights: { type: Number },
    },
    highlight: [
      {
        title: { type: String },
      },
    ],
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
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

customizedTourPackageSchema.pre("save", function (next) {
  this.slug = slugify(this.slug || this.title, { lower: true, strict: true });
  next();
});

customizedTourPackageSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  update.slug = slugify(update.slug || update.title, {
    lower: true,
    strict: true,
  });
  this.setUpdate(update);
  next();
});

export const CustomizedTourPackage = mongoose.model(
  "CustomizedTourPackage",
  customizedTourPackageSchema
);
