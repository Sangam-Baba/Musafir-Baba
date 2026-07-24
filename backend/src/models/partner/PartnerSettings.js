import mongoose from "mongoose";

const dutyLocationSchema = new mongoose.Schema({
  address: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, default: "India" },
  pincode: { type: String },
});

const vehicleSettingsSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  vehicleName: { type: String, required: true }, // For display purposes
  registrationNumber: { type: String },
  perKmRate: { type: Number, required: true },
  fullDayRate: { type: Number, required: true },
  locations: [dutyLocationSchema],
});

const partnerSettingsSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerAuth",
      required: true,
      unique: true,
    },
    vehicleConfigs: [vehicleSettingsSchema],
  },
  { timestamps: true }
);

export const PartnerSettings = mongoose.model("PartnerSettings", partnerSettingsSchema);
