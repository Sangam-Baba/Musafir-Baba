import mongoose from "mongoose";
import slugify from "slugify";
import { Destination } from "./Destination.js";
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
    canonicalUrl: String,
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
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reviews",
      },
    ],
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

customizedTourPackageSchema.pre("save", async function (next) {
  this.slug = slugify(this.slug || this.title, { lower: true, strict: true });
  if (!this.canonicalUrl) {
    const destination = await Destination.findById(this.destination).select(
      "state"
    );
    this.canonicalUrl = `/holidays/customised-tour-packages/${destination.state}/${this.slug}`;
  }
  next();
});

customizedTourPackageSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const existindDoc = await this.model.findOne(this.getQuery()).lean();

  const finalSlug = update.slug
    ? slugify(update.slug || update.title, { lower: true, strict: true })
    : existindDoc.slug;

  const changeCanonical =
    update.canonicalUrl && update.canonicalUrl !== existindDoc.canonicalUrl;
  const changeSlug = update.slug && update.slug !== existindDoc.slug;

  const chnageDestination =
    update.destination &&
    update.destination.toString() !== existindDoc.destination.toString();

  if (!changeCanonical && (changeSlug || chnageDestination)) {
    const destination = await Destination.findById(existindDoc.destination)
      .select("state")
      .lean();

    update.canonicalUrl = `/holidays/customised-tour-packages/${destination.state}/${finalSlug}`;
  }

  update.slug = finalSlug;
  this.setUpdate(update);
  next();
});

export const CustomizedTourPackage = mongoose.model(
  "CustomizedTourPackage",
  customizedTourPackageSchema
);
