import mongoose from "mongoose";

// Admin-managed rate card for MBGo ride pricing (consumed by
// services/rideFare.service.js). A single document, keyed by
// RIDE_PRICING_CONFIG_KEY.
//
// `enabled` is the master switch: while it's false (the default) ride quotes
// and bookings keep using the existing partner-rate pricing in
// ride.controller.js, untouched. Flipping it back to false is an instant
// rollback.

export const RIDE_PRICING_CONFIG_KEY = "default";

// The vehicle categories partners can actually register (see mobile's
// AddVehicleScreen / the web partner fleet form). Every rate-card vehicle
// type maps onto one of these so ride dispatch -- which matches
// RideBooking.vehicleCategory against PartnerVehicle.category exactly --
// keeps working without any change.
export const PARTNER_VEHICLE_CATEGORIES = ["Hatchback", "Sedan", "SUV", "Tempo Traveller"];

const rateCardVehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // shown to riders, e.g. "Rumion / Ertiga"
    capacityLabel: { type: String, trim: true }, // e.g. "6/7+1"
    seatingCapacity: { type: Number, required: true, min: 1 },
    partnerCategory: { type: String, required: true, enum: PARTNER_VEHICLE_CATEGORIES },
    oneWayRate: { type: Number, required: true, min: 0 }, // ₹/km
    roundTripRate: { type: Number, required: true, min: 0 }, // ₹/km
    minKmPerDay: { type: Number, required: true, min: 0 },
    extraKmRate: { type: Number, default: 0, min: 0 }, // ₹/km -- reserved for the future "Daily" trip type
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const ridePricingConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: RIDE_PRICING_CONFIG_KEY },
    enabled: { type: Boolean, default: false },

    vehicleTypes: {
      type: [rateCardVehicleSchema],
      default: [],
      validate: {
        validator: (types) => new Set(types.map((t) => t.name.toLowerCase())).size === types.length,
        message: "Vehicle type names must be unique",
      },
    },

    driverAllowancePerDay: { type: Number, default: 0, min: 0 },
    nightAllowance: {
      amount: { type: Number, default: 0, min: 0 },
      startHour: { type: Number, default: 22, min: 0, max: 23 },
      endHour: { type: Number, default: 6, min: 0, max: 23 },
      chargeOneWayIfPickupInWindow: { type: Boolean, default: true },
      chargeRoundTripPerNight: { type: Boolean, default: true },
    },
    platformCharge: {
      type: { type: String, enum: ["FLAT", "PERCENT"], default: "FLAT" },
      value: { type: Number, default: 0, min: 0 },
    },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    // Taken on the vehicle fare only (not allowances/charges/taxes).
    commissionPercent: { type: Number, default: 15, min: 0, max: 100 },
    payableOnTripNote: {
      type: String,
      trim: true,
      default: "Toll, parking, state tax, permit and other government charges are payable on the trip as actuals.",
    },
  },
  { timestamps: true }
);

export const RidePricingConfig =
  mongoose.models.RidePricingConfig || mongoose.model("RidePricingConfig", ridePricingConfigSchema);
