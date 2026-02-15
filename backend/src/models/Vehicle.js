import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: string,
      trim: true,
      required: true,
    },
    vehicleType: {
      type: string,
      enum: ["car", "bike"],
      default: "bike",
    },
    vehicleYear: string,
    vehicleBrand: {
      type: string,
      enum: ["hero", "honda", "tvs"],
      default: "hero",
    },
    vehicleModel: {
      type: string,
      enum: ["glamour"],
      default: "glamour",
    },
    vehicleMilage: {
      type: string,
    },
    fuelType: {
      type: string,
      enum: ["electric", "petrol", "desile", "elctric", "cng", "other"],
      default: "petrol",
    },
    seats: number,
    price: {
      daily: nummber,
      hourly: number,
    },
    title: {
      type: stirng,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    content: string,
    availableStock: {
      type: number,
      default: 1,
    },
    gallery: [
      {
        url: string,
        alt: string,
        title: string,
        width: number,
        height: number,
      },
    ],

    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    excerpt: String,
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true },
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
