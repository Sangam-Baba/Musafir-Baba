import mongoose from "mongoose";
import slugify from "slugify";
import { socialSchema } from "./socialSchema.js";
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
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
    },
    content: {
      type: String,
    },
    quickSummary: { type: String },
    highlights: { type: String },
    quickAnswer: { type: String },
    whyThisVisa: { type: String },
    eligibility: { type: String },
    feesAndCharges: { type: String },
    howToApply: { type: String },
    helpfulResources: [
      {
        title: String,
        url: String,
      },
    ],
    cta: { type: String },
    excerpt: {
      type: String,
    },
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
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
    necessaryDocuments: {
      type: [String],
      default: [],
    },
    documentsContent: {
      type: String,
    },
    process: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    childUrl: {
      type: String,
    },
    rejectionReasons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VisaRejectionReason",
      },
    ],
    expertTips: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VisaExpertTip",
      },
    ],
    visas: [
      {
        visaPurpose: { type: String },
        visaType: { type: String },
        governmentFee: { type: Number, default: 0 },
        serviceCharges: { type: Number, default: 0 },
        gst: { type: Number, default: 0 },
        gstTypeOrPercentageText: { type: String },
        documents: { type: String },
        processSteps: { type: String },
        // Legacy single fields (kept for backward compatibility)
        visaValidity: { type: String },
        visaDuration: { type: String },
        entryType: { type: String },
        processTime: { type: String },
        // New: multiple validity entries per visa card
        validityEntries: [
          {
            visaValidity: { type: String },
            visaDuration: { type: String },
            entryType: { type: String },
            processTime: { type: String },
            governmentFee: { type: Number, default: 0 },
            serviceCharges: { type: Number, default: 0 },
            gst: { type: Number, default: 0 },
            expressVisaDuration: { type: String },
            expressGovernmentFee: { type: Number, default: 0 },
            expressServiceCharges: { type: Number, default: 0 },
          },
        ],
        isExpress: { type: Boolean, default: false },
        expressVisaDuration: { type: String },
        expressGovernmentFee: { type: Number, default: 0 },
        expressServiceCharges: { type: Number, default: 0 },
      },
    ],
    social: {
      type: socialSchema,
      default: () => ({
        twitter: { inheritOpenGraph: true }
      })
    }
  },
  { timestamps: true }
);

visaSchema.pre("save", function (next) {
  if (this.isModified("slug")) {
    this.slug = slugify(this.slug || this.title, { lower: true, strict: true });
  }
  if (!this.canonicalUrl) this.canonicalUrl = `/visa/${this.slug}`;
  next();
});

visaSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const existindDoc = await this.model.findOne(this.getQuery()).lean();
  
  // Extract fields whether they are in $set or top-level
  const updatedSlug = update.$set?.slug !== undefined ? update.$set.slug : update.slug;
  const updatedTitle = update.$set?.title !== undefined ? update.$set.title : update.title;
  const updatedCanonicalUrl = update.$set?.canonicalUrl !== undefined ? update.$set.canonicalUrl : update.canonicalUrl;

  const finalSlug = updatedSlug
    ? slugify(updatedSlug || updatedTitle, { lower: true, strict: true })
    : existindDoc?.slug;

  const changeCanonical =
    updatedCanonicalUrl && updatedCanonicalUrl !== existindDoc?.canonicalUrl;
  const changeSlug = updatedSlug && updatedSlug !== existindDoc?.slug;
  
  if (!changeCanonical || changeSlug) {
    if (update.$set) {
      update.$set.canonicalUrl = `/visa/${finalSlug}`;
    } else {
      update.canonicalUrl = `/visa/${finalSlug}`;
    }
  }
  
  this.setUpdate(update);
  next();
});

export const Visa = mongoose.model("Visa", visaSchema);
