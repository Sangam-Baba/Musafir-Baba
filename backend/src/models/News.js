import mongoose from "mongoose";
import slugify from "slugify";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [600, "Title must be less then 600 characters"],
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      maxlength: 3000,
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
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
    },
    tags: [String],
    metaTitle: {
      type: String,
      maxlength: 400,
    },
    metaDescription: {
      type: String,
      maxlength: 600,
    },
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
    keywords: [
      {
        type: String,
      },
    ],
    canonicalUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

newsSchema.pre("save", function (next) {
  if (this.isModified("slug")) {
    this.slug = slugify(this.slug, { lower: true, strict: true });
  }
  next();
});

newsSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const existindDoc = await this.model.findOne(this.getQuery()).lean();

  const finalSlug = update.slug
    ? slugify(update.slug, { lower: true, strict: true })
    : existindDoc.slug;

  const changeCanonical =
    update.canonicalUrl && update.canonicalUrl !== existindDoc.canonicalUrl;
  const changeSlug = update.slug && update.slug !== existindDoc.slug;
  if (!changeCanonical || changeSlug) {
    update.canonicalUrl = `/news/${finalSlug}`;
  }
  update.slug = finalSlug;
  this.setUpdate(update);
  next();
});

newsSchema.index({ title: "text", content: "text" });
newsSchema.index({ tags: 1 });
export const News = mongoose.model("News", newsSchema);
