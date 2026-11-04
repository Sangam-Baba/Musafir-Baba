import mongoose from "mongoose";
import slugify from "slugify";

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trime: true, unique: true },
    country: { type: String, required: true, index: true },
    state: { type: String, index: true },
    city: { type: String },
    description: { type: String },
    content: { type: String },
    coverImage: {
      alt: String,
      url: String,
      public_id: String,
      hight: Number,
      width: Number,
    },
    gallery: [
      {
        alt: String,
        url: String,
        public_id: String,
        hight: Number,
        width: Number,
      },
    ],

    bestTimeToVisit: String,
    popularAttractions: [String],
    thingsToDo: [String],

    slug: { type: String, unique: true, index: true },

    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    // FAQs shown on /destinations/{slug} and emitted as FAQPage structured data
    faqSchema: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
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
    destinationType: {
      type: String,
      enum: ["package", "vehicle"],
      default: "package",
    },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    // Domestic / International split on /destinations. Optional: when unset
    // the frontend falls back to country === "india" ? domestic : international.
    region: {
      type: String,
      enum: ["domestic", "international", null],
      default: null,
      set: (v) => v || null,
    },
    // Set only on sub-destinations (one level deep). Top-level destinations
    // (every pre-existing document) have no parent, so `{ parent: null }`
    // matches them all.
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      default: null,
      index: true,
      set: (v) => v || null,
    },
  },
  { timestamps: true },
);

destinationSchema.pre("save", function (next) {
  if (this.parent) {
    // Sub-destinations share their parent's state, so their slug comes from
    // their own name (URL: /destinations/{parent.slug}/{slug})
    if (this.isModified("name") || this.isModified("parent")) {
      this.slug = slugify(this.name, { lower: true, strict: true });
    }
  } else if (this.isModified("name")) {
    this.slug = slugify(this.state, { lower: true, strict: true });
  }
  next();
});
destinationSchema.pre("save", function (next) {
  if (this.isModified("country")) {
    this.country = slugify(this.country, { lower: true, strict: true });
  }
  next();
});

destinationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.country) {
    update.country = slugify(update.country, { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});

destinationSchema.pre("save", function (next) {
  if (this.isModified("state")) {
    this.state = slugify(this.state, { lower: true, strict: true });
  }
  next();
});

destinationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.state) {
    update.state = slugify(update.state, { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});
destinationSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  let parent = update.parent;
  if (parent === undefined && update.state) {
    const existing = await this.model
      .findOne(this.getQuery())
      .select("parent")
      .lean();
    parent = existing?.parent;
  }
  if (parent) {
    if (update.name) {
      update.slug = slugify(update.name, { lower: true, strict: true });
      this.setUpdate(update);
    }
  } else if (update.state) {
    update.slug = slugify(update.state, { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});
export const Destination = mongoose.model("Destination", destinationSchema);
