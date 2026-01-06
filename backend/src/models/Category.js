import mongoose from "mongoose";
import slugify from "slugify";
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 character"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "description cannot exceed 200 character"],
    },
    content: {
      type: String,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
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
    keywords: [String],
    packages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Package" }],
    coverImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre("save", function (next) {
  if (this.isModified("slug")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

categorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.slug) {
    update.slug = slugify(update.slug, { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});
export const Category = mongoose.model("Category", categorySchema);
