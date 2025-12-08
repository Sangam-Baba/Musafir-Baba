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
      type: String,
      enum: ["bookings", "visa", "noparent", "travel-agency", "chardham"],
      default: "visa",
    },
  },
  { timestamps: true }
);

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
