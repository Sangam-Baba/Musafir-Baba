import mongoose from "mongoose";

const vehicleTypeSchema = new mongoose.Schema(
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

export const VehicleType = mongoose.model(
  "VehicleType",
  vehicleTypeSchema,
  "vehicle_type"
);
