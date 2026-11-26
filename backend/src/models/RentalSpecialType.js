import mongoose from "mongoose";

// "Special type" for rental landing pages, e.g. "Wedding Car" in
// /rental/{location}/{special-type}/{slug}. Created by admins like vehicle
// types, but a separate list: vehicles never point at it, so nothing in the
// existing rental pages reads it. Its slug may never equal a vehicle type's
// (checked in rentalSpecial.controller.js) so the two URL kinds can't clash.
const rentalSpecialTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

export const RentalSpecialType = mongoose.model(
  "RentalSpecialType",
  rentalSpecialTypeSchema,
  "rental_special_types",
);
