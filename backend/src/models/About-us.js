import mongoose from "mongoose";
import slugify from "slugify";
const aboutUsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    upperImage: [
      {
        url: String,
        alt: String,
        public_id: String,
        width: Number,
        height: Number,
      },
    ],
    lowerImage: [
      {
        url: String,
        alt: String,
        public_id: String,
        width: Number,
        height: Number,
      },
    ],
    coverImage: {
      url: String,
      alt: String,
      public_id: String,
      width: Number,
      height: Number,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    h2title: {
      type: String,
    },
    h2description: {
      type: String,
    },
    h2content: [
      {
        title: String,
        description: String,
        image: {
          url: String,
          alt: String,
          public_id: String,
          width: Number,
          height: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

aboutUsSchema.pre("save", function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

aboutUsSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  update.slug = slugify(update.title, { lower: true });
  this.setUpdate(update);
  next();
});
export const AboutUs = mongoose.model("AboutUs", aboutUsSchema);
