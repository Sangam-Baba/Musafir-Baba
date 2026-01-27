import mongoose from "mongoose";
import slugify from "slugify";
import { Category } from "./Category.js";
import { Destination } from "./Destination.js";

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
    addOns: [
      {
        title: { type: String },
        items: [
          {
            title: { type: String },
            price: { type: Number },
          },
        ],
      },
    ],
    isBestSeller: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true },
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

packageSchema.pre("save", async function (next) {
  if (!this.mainCategory || !this.destination || !this.slug) {
    return next();
  }

  const [category, destination] = await Promise.all([
    Category.findById(this.mainCategory).select("slug"),
    Destination.findById(this.destination).select("slug"),
  ]);

  if (!category || !destination) return next();

  this.canonicalUrl = `/holidays/${category.slug}/${destination.slug}/${this.slug}`;

  next();
});

packageSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const existing = await this.model.findOne(this.getQuery()).lean();

  // 🔹 Compute final slug
  const finalSlug = update.slug
    ? slugify(update.slug, { lower: true, strict: true })
    : existing.slug;

  // 🔹 Detect structure changes
  const categoryChanged =
    update.mainCategory &&
    update.mainCategory.toString() !== existing.mainCategory?.toString();

  const destinationChanged =
    update.destination &&
    update.destination.toString() !== existing.destination?.toString();

  const slugChanged = finalSlug !== existing.slug;

  // 🔹 Detect manual canonical edit
  const canonicalEdited =
    !!update.canonicalUrl &&
    update.canonicalUrl.toString() !== existing.canonicalUrl.toString();

  // 🔹 Auto-generate canonical if needed
  if (
    (categoryChanged ||
      destinationChanged ||
      slugChanged ||
      update.canonicalUrl === "") &&
    !canonicalEdited
  ) {
    const categoryId = update.mainCategory ?? existing.mainCategory;
    const destinationId = update.destination ?? existing.destination;

    const [category, destination] = await Promise.all([
      Category.findById(categoryId).select("slug"),
      Destination.findById(destinationId).select("slug"),
    ]);

    if (category && destination) {
      update.canonicalUrl = `/holidays/${category.slug}/${destination.slug}/${finalSlug}`;
    }
  }

  update.slug = finalSlug;
  this.setUpdate(update);
  next();
});

export const Package = mongoose.model("Package", packageSchema);
