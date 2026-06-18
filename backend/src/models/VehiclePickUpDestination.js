import mongoose from "mongoose";
import slugify from "slugify";

const vehiclePickUpDestinationSchema = new mongoose.Schema(
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
      sparse: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    bannerImage: {
      url: String,
      alt: String,
    },
    content: {
      type: String, // Rich HTML content
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

// Auto-generate slug before saving
vehiclePickUpDestinationSchema.pre("save", function (next) {
  if (!this.slug || this.isModified("slug")) {
    this.slug = slugify(this.slug || this.name, { lower: true, strict: true });
  }
  next();
});

// Auto-generate slug before updating
vehiclePickUpDestinationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.slug) {
    update.slug = slugify(update.slug || update.name, {
      lower: true,
      strict: true,
    });
  } else if (update.name && !update.slug) {
    update.slug = slugify(update.name, {
      lower: true,
      strict: true,
    });
  }
  this.setUpdate(update);
  next();
});

export const VehiclePickUpDestination = mongoose.model(
  "VehiclePickUpDestination",
  vehiclePickUpDestinationSchema,
  "vehicle_pick_up_destination" /* Explicit collection name requested */
);
