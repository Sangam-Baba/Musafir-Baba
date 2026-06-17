import mongoose from "mongoose";

const vehicleTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    title: {
      type: String,
    },
    slug: {
      type: String,
      unique: true,
    },
    bannerImage: {
      url: String,
      alt: String,
    },
    content: {
      type: String,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    canonicalUrl: {
      type: String,
    },
    excerpt: {
      type: String,
    },
    keywords: [String],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

import slugify from "slugify";

vehicleTypeSchema.pre("save", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

vehicleTypeSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.name) {
    update.slug = slugify(update.name, { lower: true, strict: true });
  }
  this.setUpdate(update);
  next();
});

export const VehicleType = mongoose.model(
  "VehicleType",
  vehicleTypeSchema,
  "vehicle_type"
);
