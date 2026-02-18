import mongoose from "mongoose";

const vehicleBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    checkIn: {
      type: String,
      required: true,
      trim: true,
    },
    checkOut: {
      type: String,
      required: true,
      trim: true,
    },
    bookingDate: {
      type: Date,
      default: Date.now(),
    },
    noOfVehicle: {
      type: Number,
      required: true,
      default: 1,
    },
    paymentMethod: {
      type: String,
      enum: ["PayU", "Cash", "Online"],
      default: "PayU",
    },
    paymentInfo: {
      orderId: String,
      paymentId: String,
      signature: String,
      status: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
    },
    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

export const VehicleBooking = mongoose.model(
  "VehicleBooking",
  vehicleBookingSchema,
);
