import mongoose from "mongoose";

const vehiclePickUpDestinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const VehiclePickUpDestination = mongoose.model(
  "VehiclePickUpDestination",
  vehiclePickUpDestinationSchema,
  "vehicle_pick_up_destination" /* Explicit collection name requested */
);
