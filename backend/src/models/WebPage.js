import mongoose from "mongoose";
import slugify from "slugify";
const webPageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
    },
    coverImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reviews",
      },
    ],
    metaTitle: String,
    metaDescription: String,
    excerpt: String,
    schemaType: String,
    keywords: {
      type: [String],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebPage",
    },
    fullSlug: {
      type: String,
      unique: true, // e.g. travel/india/goa/beaches
      index: true,
    },
    isParent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

webPageSchema.pre("save", async function (next) {
  const parent = this.parent
    ? await this.model("WebPage").findById(this.parent)
    : null;

  this.slug = slugify(this.slug, { lower: true, strict: true });

  this.fullSlug = parent ? `${parent.fullSlug}/${this.slug}` : this.slug;

  next();
});

webPageSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const update = this.getUpdate();
  if (!update.slug) return; // slug not changed → skip

  // After slug change, refresh fullSlug for this page & children
  await doc.updateFullSlugRecursively();
});

webPageSchema.methods.updateFullSlugRecursively = async function () {
  const parent = this.parent
    ? await this.model("WebPage").findById(this.parent)
    : null;

  // Generate fullSlug for current page
  this.fullSlug = parent ? `${parent.fullSlug}/${this.slug}` : this.slug;
  await this.save({ validateBeforeSave: false });

  // Find children
  const children = await this.model("WebPage").find({ parent: this._id });

  // Update each child recursively
  for (const child of children) {
    await child.updateFullSlugRecursively();
  }
};

webPageSchema.pre("save", function (next) {
  this.slug = slugify(this.slug, { lower: true, strict: true });
  next();
});
webPageSchema.pre("findOneAndUpdate", function (next) {
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

export const WebPage = mongoose.model("WebPage", webPageSchema);
