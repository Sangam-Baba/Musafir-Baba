import mongoose from "mongoose";

// Landing-page content for one pickup location + vehicle type, shown on
// /rental/{location}/{type} (e.g. /rental/delhi/traveller). One page per pair.
// Optional: without one, that URL shows an auto-generated heading/title.
const rentalCityPageSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehiclePickUpDestination",
      required: true,
    },
    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType",
      required: true,
    },
    title: { type: String, trim: true }, // H1
    bannerImage: {
      url: String,
      alt: String,
    },
    content: String, // rich HTML
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

rentalCityPageSchema.index({ location: 1, vehicleType: 1 }, { unique: true });

export const RentalCityPage = mongoose.model(
  "RentalCityPage",
  rentalCityPageSchema,
  "rental_city_pages",
);
