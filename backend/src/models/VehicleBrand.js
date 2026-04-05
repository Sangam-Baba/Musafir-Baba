import mongoose from "mongoose";

const vehicleBrandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const VehicleBrand = mongoose.model(
  "VehicleBrand",
  vehicleBrandSchema,
  "vehicle_brand"
);
