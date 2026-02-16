import mongoose from "mongoose";
import slugify from "slugify";

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      trim: true,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ["car", "bike"],
      default: "bike",
    },
    vehicleYear: String,
    vehicleBrand: {
      type: String,
      enum: ["hero", "honda", "tvs"],
      default: "hero",
    },
    vehicleModel: {
      type: String,
      enum: ["glamour"],
      default: "glamour",
    },
    vehicleMilage: {
      type: String,
    },
    fuelType: {
      type: String,
      enum: ["electric", "petrol", "diesel", "cng", "other"],
      default: "petrol",
    },
    features: [String],
    seats: Number,
    price: {
      daily: Number,
      hourly: Number,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    content: String,
    availableStock: {
      type: Number,
      default: 1,
    },
    gallery: [
      {
        url: String,
        alt: String,
        title: String,
        width: Number,
        height: Number,
      },
    ],
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    excerpt: String,
    keywords: [String],
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true },
);

vehicleSchema.pre("save", function (next) {
  if (!this.slug || this.isModified("slug")) {
    this.slug = slugify(this.slug || this.title, { lower: true, strict: true });
  }
  next();
});

vehicleSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.slug) {
    update.slug = slugify(update.slug || update.title, {
      lower: true,
      strict: true,
    });
  }
  this.setUpdate(update);
  next();
});

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
