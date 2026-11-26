import mongoose from "mongoose";

// One special rental page:
//   slug ""      -> /rental/{location}/{special-type}         (landing page)
//   slug "xyz"   -> /rental/{location}/{special-type}/xyz     (detail page)
// Both show one banner, the MBGo ride search (start point + where to, set by
// the admin) and the content. One page per location + type + slug.
const searchPointSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    lat: Number,
    lng: Number,
  },
  { _id: false },
);

const rentalSpecialPageSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehiclePickUpDestination",
      required: true,
    },
    specialType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalSpecialType",
      required: true,
    },
    slug: { type: String, default: "" },
    title: { type: String, trim: true }, // H1
    bannerImage: {
      url: String,
      alt: String,
    },
    content: String, // rich HTML
    searchFrom: { type: searchPointSchema, default: () => ({ address: "Delhi" }) },
    searchTo: { type: searchPointSchema, default: () => ({}) },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

rentalSpecialPageSchema.index({ location: 1, specialType: 1, slug: 1 }, { unique: true });

export const RentalSpecialPage = mongoose.model(
  "RentalSpecialPage",
  rentalSpecialPageSchema,
  "rental_special_pages",
);
