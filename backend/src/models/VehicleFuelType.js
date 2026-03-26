import mongoose from "mongoose";

const vehicleFuelTypeSchema = new mongoose.Schema(
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

export const VehicleFuelType = mongoose.model(
  "VehicleFuelType",
  vehicleFuelTypeSchema,
  "vehicle_fuel_type"
);
