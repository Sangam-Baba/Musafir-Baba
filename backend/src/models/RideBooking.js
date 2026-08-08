import mongoose from "mongoose";

const locationPointSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const rideBookingSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderProfile",
      required: true,
    },
    pickup: { type: locationPointSchema, required: true },
    drop: { type: locationPointSchema, required: true },
    rideDate: { type: String, required: true }, // e.g. "2025-05-20"
    rideTime: { type: String, required: true }, // e.g. "08:00 AM"
    vehicleCategory: { type: String, required: true }, // e.g. "Sedan", "SUV"
    passengerCount: { type: Number, default: 1 },
    distanceKm: { type: Number, required: true },
    fareBreakdown: {
      baseFare: { type: Number, default: 0 },
      driverAllowance: { type: Number, default: 0 },
      tollAndTaxes: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
    },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["PayU", "Cash"],
      default: "PayU",
    },
    paymentInfo: {
      txnid: String,
      mihpayid: String,
      hash: String,
      status: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
    },
    status: {
      type: String,
      enum: [
        "PAYMENT_PENDING",
        "PAID",
        "AWAITING_ASSIGNMENT",
        "ACCEPTED",
        "DRIVER_EN_ROUTE",
        "ARRIVED",
        "ONGOING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PAYMENT_PENDING",
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    assignedPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
    },
    assignedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerVehicle",
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerDriver",
    },
    tripStartOtp: { type: String },
    platformCommissionPercent: { type: Number, default: 15 },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

export const RideBooking =
  mongoose.models.RideBooking || mongoose.model("RideBooking", rideBookingSchema);
