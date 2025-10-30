import mongoose from "mongoose";
import slugify from "slugify";

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trime: true, unique: true },
    country: { type: String, required: true, index: true },
    state: { type: String, index: true },
    city: { type: String },
    description: { type: String },
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
    canonicalUrl: String,
    schemaType: String,
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

destinationSchema.pre("save", function (next) {
  if (this.isModified("name")) {
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
destinationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.state) {
    update.slug = slugify(update.state, { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});
export const Destination = mongoose.model("Destination", destinationSchema);
