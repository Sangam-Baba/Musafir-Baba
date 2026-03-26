import mongoose from "mongoose";

const vehicleTransmissionSchema = new mongoose.Schema(
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

export const VehicleTransmission = mongoose.model(
  "VehicleTransmission",
  vehicleTransmissionSchema,
  "vehicle_transmission"
);
