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
    canonicalUrl: String,
    excerpt: String,
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
    howToSchema: String,
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
      refPath: "parentModel",
    },
    parentModel: {
      type: String,
      enum: ["WebPage", "Visa"],
      default: "WebPage",
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
    footerLinks: [
      {
        title: String,
        url: String,
      },
    ],
  },
  { timestamps: true },
);

webPageSchema.pre("save", async function (next) {
  let parent = null;
  if (this.parent) {
    if (this.parentModel === "Visa") {
      parent = await this.model("Visa").findById(this.parent);
    } else {
      parent = await this.model("WebPage").findById(this.parent);
    }
  }

  this.slug = slugify(this.slug, { lower: true, strict: true });

  if (parent) {
    if (this.parentModel === "Visa") {
      this.fullSlug = `visa/${parent.slug}/${this.slug}`;
    } else {
      this.fullSlug = `${parent.fullSlug}/${this.slug}`;
    }
  } else {
    this.fullSlug = this.slug;
  }

  next();
});

webPageSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const update = this.getUpdate();
  if (!update.slug && !update.parent) return; // slug not changed → skip

  // After slug change, refresh fullSlug for this page & children
  await doc.updateFullSlugRecursively();
});

webPageSchema.methods.updateFullSlugRecursively = async function () {
  // Build its own fullSlug
  let parent = null;
  if (this.parent) {
    if (this.parentModel === "Visa") {
      parent = await this.model("Visa").findById(this.parent);
    } else {
      parent = await this.model("WebPage").findById(this.parent);
    }
  }

  const oldFullSlug = this.fullSlug;

  if (parent) {
    if (this.parentModel === "Visa") {
      this.fullSlug = `visa/${parent.slug}/${this.slug}`;
    } else {
      this.fullSlug = `${parent.fullSlug}/${this.slug}`;
    }
  } else {
    this.fullSlug = this.slug;
  }
  await this.save({ validateBeforeSave: false });

  if (!this.canonicalUrl || this.canonicalUrl === `/${oldFullSlug}`) {
    this.canonicalUrl = `/${this.fullSlug}`;
  }
  await this.save({ validateBeforeSave: false });
  // Update all children
  const children = await this.model("WebPage").find({ parent: this._id });

  for (const child of children) {
    await child.updateFullSlugRecursively();
  }
};

webPageSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const update = this.getUpdate();
  const updatedFields = update.$set || update;

  const slugChanged = Boolean(updatedFields.slug);
  const parentChanged = Boolean(updatedFields.parent);

  if (!slugChanged && !parentChanged) return;

  await doc.updateFullSlugRecursively();
});

webPageSchema.pre("save", function (next) {
  this.slug = slugify(this.slug, { lower: true, strict: true });
  if (!this.canonicalUrl) this.canonicalUrl = `/${this.fullSlug}`;
  next();
});

webPageSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  const finalSlug = update.slug
    ? slugify(update.slug, { lower: true, strict: true })
    : existindDoc.slug;
  update.slug = finalSlug;
  this.setUpdate(update);
  next();
});

export const WebPage = mongoose.model("WebPage", webPageSchema);
