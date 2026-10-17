import mongoose from "mongoose";

// MBConnect "Test Rides": admin-broadcast sample ride alerts, clearly badged
// TEST RIDE, that can't be accepted. Stored ONLY here -- never in RideBooking,
// so real dispatch, bookings, earnings, wallet, reports and dashboards never
// see them.

export const TEST_RIDE_CONFIG_KEY = "default";

const rangeSchema = { min: Number, max: Number };

const testRideConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: TEST_RIDE_CONFIG_KEY },
    riderNames: { type: [String], default: undefined },
    cityPlaces: [{ city: String, places: [String], _id: false }],
    genericPlaces: { type: [String], default: undefined }, // "{city}" is replaced with the driver's city
    tripMix: { oneWay: Number, roundTrip: Number, outstation: Number }, // percentages
    distanceKm: { local: rangeSchema, outstation: rangeSchema },
    perKm: rangeSchema, // ₹ per km (fare = distance × random value in range, ×2 for round trips)
    visibleMinutes: Number,
    notificationTitle: String,
    notificationMessage: String,
    acceptMessage: String,
  },
  { timestamps: true }
);
export const PartnerTestRideConfig =
  mongoose.models.PartnerTestRideConfig || mongoose.model("PartnerTestRideConfig", testRideConfigSchema);

const testRideBroadcastSchema = new mongoose.Schema(
  {
    target: { type: String, enum: ["CITIES", "ONLINE", "SELECTED"], required: true },
    cities: [String],
    onlineOnly: Boolean,
    partnerAuthIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PartnerAuth" }],
    ridesPerDriver: { type: Number, default: 1 },
    sendPush: { type: Boolean, default: true },
    visibleMinutes: Number,
    expiresAt: { type: Date, index: true },
    endedAt: Date,
    endedBy: String,
    driverCount: { type: Number, default: 0 },
    rideCount: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 }, // drivers with no work-location city / vehicle
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    createdBy: String,
  },
  { timestamps: true }
);
export const PartnerTestRideBroadcast =
  mongoose.models.PartnerTestRideBroadcast || mongoose.model("PartnerTestRideBroadcast", testRideBroadcastSchema);

const testRideSchema = new mongoose.Schema(
  {
    broadcastId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerTestRideBroadcast", index: true },
    partnerAuthId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerAuth", required: true },
    riderName: String,
    city: String,
    pickup: String,
    drop: String,
    tripType: { type: String, enum: ["ONE_WAY", "ROUND_TRIP", "OUTSTATION"] },
    rideDate: String, // same format as RideBooking.rideDate (YYYY-MM-DD)
    rideTime: String, // same format as RideBooking.rideTime (h:mm AM/PM)
    distanceKm: Number,
    fare: Number,
    vehicleCategory: String,
    expiresAt: { type: Date, index: true },
    seenAt: Date,
    acceptTaps: { type: Number, default: 0 },
    firstAcceptTapAt: Date,
  },
  { timestamps: true }
);
testRideSchema.index({ partnerAuthId: 1, expiresAt: -1 });
export const PartnerTestRide = mongoose.models.PartnerTestRide || mongoose.model("PartnerTestRide", testRideSchema);
