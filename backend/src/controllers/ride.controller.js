import crypto from "crypto";
import { RideBooking } from "../models/RideBooking.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import PartnerVehicle from "../models/partner/PartnerVehicle.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import { PartnerSettings } from "../models/partner/PartnerSettings.js";
import { getRouteDistance, searchAddressSuggestions, reverseGeocode } from "../services/geo.service.js";
import { notifyUser } from "../services/notification/notificationService.js";

const FLAT_DRIVER_ALLOWANCE = 100;
const DEFAULT_COMMISSION_PERCENT = 15;

// How long a ride sits in the auto-broadcast pool before a cron job flags it
// as needing admin attention (see startBroadcastExpiryCron). Shared so every
// place that puts a ride into AWAITING_ASSIGNMENT sets the same window.
export const BROADCAST_WINDOW_MINUTES = 10;
export function getBroadcastExpiry() {
  return new Date(Date.now() + BROADCAST_WINDOW_MINUTES * 60 * 1000);
}

// Driver/vehicle identity (rider side) and rider contact details (partner
// side) stay hidden until this many hours before the scheduled trip -- see
// getRideById / partnerExtra.controller.js's getBookings / acceptRide.
export const REVEAL_WINDOW_HOURS = 24;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// Parses rideDate ("YYYY-MM-DD") + rideTime ("HH:MM AM/PM") -- the only
// place these strings are combined into an actual instant anywhere in the
// codebase -- into the real UTC Date they represent, treating them as
// Asia/Kolkata wall-clock time (matching the timezone the broadcast-expiry
// and details-reveal crons already run in). Doesn't depend on the server
// process's own timezone.
export function getRideDateTime(ride) {
  const [year, month, day] = ride.rideDate.split("-").map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(ride.rideTime).trim());
  if (!year || !month || !day || !match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS);
}

// True once we're within REVEAL_WINDOW_HOURS of the scheduled trip --
// independent of whether a partner has actually been assigned yet, so it can
// also be used to predict/word a message before acceptance happens.
export function isWithin24h(ride) {
  const rideDateTime = getRideDateTime(ride);
  if (!rideDateTime) return false;
  return rideDateTime.getTime() - Date.now() <= REVEAL_WINDOW_HOURS * 60 * 60 * 1000;
}

const ASSIGNED_STATUSES = ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING", "COMPLETED"];

// The actual gating condition used to decide whether to include
// driver/vehicle/rider-contact identity in an API response.
export function isDetailsRevealed(ride) {
  return ASSIGNED_STATUSES.includes(ride.status) && isWithin24h(ride);
}

// Hardcoded placeholder data used only when no real, active PartnerVehicle
// serves a category for the requested route -- keeps the rider from hitting
// a dead-end "no vehicles" search on routes/cities without onboarded
// partners yet. TODO: replace with an admin-managed collection (see
// docs/fallback_vehicle_data_spec.md) once that panel exists; this object is
// the placeholder for that future config.
const FALLBACK_VEHICLE_RATES = [
  { category: "Hatchback", vehicleName: "Hatchback (Swift, i10 or similar)", seatingCapacity: 4, perKmRate: 11 },
  { category: "Sedan", vehicleName: "Sedan (Dzire, Etios or similar)", seatingCapacity: 4, perKmRate: 13 },
  { category: "SUV", vehicleName: "SUV (Ertiga, Innova or similar)", seatingCapacity: 6, perKmRate: 17 },
  { category: "Tempo Traveller", vehicleName: "Tempo Traveller (12-16 seater)", seatingCapacity: 12, perKmRate: 22 },
];

// req.riderId (from the JWT) is the RiderAuth id; RideBooking.rider references
// RiderProfile, so resolve the profile id once and reuse it (mirrors how the
// partner controllers resolve PartnerProfile from req.partnerId/authId).
async function getRiderProfileId(req) {
  const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id").lean();
  return riderProfile?._id || null;
}

// Matches a free-text address like "New Delhi, Delhi" against a serviceable city name.
export function cityMatches(address, city) {
  if (!address || !city) return false;
  return address.toLowerCase().includes(city.toLowerCase());
}

// For a given distance + pickup/drop, find the cheapest eligible offer per vehicle category
// by matching Active PartnerVehicles to their PartnerSettings rate + serviceable locations.
async function computeCategoryOffers(pickupAddress, dropAddress, distanceKm) {
  const vehicles = await PartnerVehicle.find({ status: "Active", isDeleted: false }).lean();

  const partnerIds = vehicles.length ? [...new Set(vehicles.map((v) => String(v.partnerId)))] : [];
  const profiles = partnerIds.length ? await PartnerProfile.find({ _id: { $in: partnerIds } }).lean() : [];
  const profileById = new Map(profiles.map((p) => [String(p._id), p]));

  const authIds = profiles.map((p) => String(p.authId));
  const settingsList = authIds.length ? await PartnerSettings.find({ authId: { $in: authIds } }).lean() : [];
  const settingsByAuthId = new Map(settingsList.map((s) => [String(s.authId), s]));

  const offersByCategory = new Map(); // category -> { fare, partnerId, vehicleId, eligibleCount }

  for (const vehicle of vehicles) {
    const profile = profileById.get(String(vehicle.partnerId));
    if (!profile) continue;

    const settings = settingsByAuthId.get(String(profile.authId));
    if (!settings) continue;

    const vehicleConfig = (settings.vehicleConfigs || []).find(
      (c) => String(c.vehicleId) === String(vehicle._id)
    );
    if (!vehicleConfig) continue;

    // Only the pickup city needs to match a serviceable location for now
    // (drop-city matching intentionally disabled per product decision).
    const serviceable = (vehicleConfig.locations || []).some(
      (loc) => cityMatches(pickupAddress, loc.city)
    );
    if (!serviceable) continue;

    const baseFare = Math.round(vehicleConfig.perKmRate * distanceKm);
    const totalAmount = baseFare + FLAT_DRIVER_ALLOWANCE;

    const category = vehicle.category;
    const existing = offersByCategory.get(category);
    if (existing) {
      existing.eligibleCount += 1;
      if (totalAmount < existing.totalAmount) {
        existing.totalAmount = totalAmount;
        existing.baseFare = baseFare;
        existing.vehicleName = `${vehicle.brand} ${vehicle.model}`;
        existing.seatingCapacity = vehicle.seatingCapacity;
      }
    } else {
      offersByCategory.set(category, {
        category,
        vehicleName: `${vehicle.brand} ${vehicle.model}`,
        seatingCapacity: vehicle.seatingCapacity,
        baseFare,
        driverAllowance: FLAT_DRIVER_ALLOWANCE,
        totalAmount,
        eligibleCount: 1,
      });
    }
  }

  // Fill in any category with no real partner offer using the hardcoded
  // placeholder rates above, so the rider always sees every vehicle
  // category priced -- never overrides a real offer that was already found.
  for (const fallback of FALLBACK_VEHICLE_RATES) {
    if (offersByCategory.has(fallback.category)) continue;
    const baseFare = Math.round(fallback.perKmRate * distanceKm);
    offersByCategory.set(fallback.category, {
      category: fallback.category,
      vehicleName: fallback.vehicleName,
      seatingCapacity: fallback.seatingCapacity,
      baseFare,
      driverAllowance: FLAT_DRIVER_ALLOWANCE,
      totalAmount: baseFare + FLAT_DRIVER_ALLOWANCE,
      eligibleCount: 0,
      isFallback: true,
    });
  }

  return Array.from(offersByCategory.values());
}

// @route   GET /api/ride/geocode/search?q=...
// @desc    Free-text address search (autocomplete) for the pick-up/drop fields.
export const searchLocations = async (req, res) => {
  try {
    const { q } = req.query;
    const suggestions = await searchAddressSuggestions(q);
    return res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Search Locations Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/ride/geocode/reverse?lat=...&lng=...
// @desc    Reverse-geocode device GPS coordinates into a display address.
export const reverseGeocodeLocation = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: "Valid lat and lng are required" });
    }
    const result = await reverseGeocode(lat, lng);
    if (!result) {
      return res.status(404).json({ success: false, message: "Could not resolve this location" });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Reverse Geocode Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/ride/quote
// @desc    Given pickup/drop + optional vehicle category, return available vehicle
//          categories with estimated fares (no partner is chosen yet at this stage).
export const getRideQuote = async (req, res) => {
  try {
    const { pickup, drop } = req.body;

    if (!pickup?.address || !drop?.address) {
      return res.status(400).json({ success: false, message: "Pickup and drop addresses are required" });
    }

    const route = await getRouteDistance(pickup, drop);
    const offers = await computeCategoryOffers(pickup.address, drop.address, route.distanceKm);

    return res.status(200).json({
      success: true,
      data: {
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        offers,
      },
    });
  } catch (error) {
    console.error("Get Ride Quote Error:", error.message);
    return res.status(400).json({ success: false, message: error.message || "Could not fetch quote" });
  }
};

// @route   POST /api/ride
// @desc    Create a ride booking in PAYMENT_PENDING status. The client then
//          calls the existing generic /payment endpoint using the returned
//          rideId as udf1 to get the PayU redirect.
export const createRide = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId });
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    const { pickup, drop, rideDate, rideTime, vehicleCategory, passengerCount, tripType, returnDate, returnTime } = req.body;

    if (!pickup?.address || !drop?.address || !rideDate || !rideTime || !vehicleCategory) {
      return res.status(400).json({ success: false, message: "Missing required ride details" });
    }

    const isRoundTrip = tripType === "ROUND_TRIP";
    if (isRoundTrip && (!returnDate || !returnTime)) {
      return res.status(400).json({ success: false, message: "Return date and time are required for a round trip" });
    }

    const route = await getRouteDistance(pickup, drop);
    const offers = await computeCategoryOffers(pickup.address, drop.address, route.distanceKm);
    const offer = offers.find((o) => o.category === vehicleCategory);

    if (!offer) {
      return res.status(400).json({ success: false, message: "No partner currently serves this route for the selected vehicle category" });
    }

    const tripStartOtp = String(Math.floor(1000 + Math.random() * 9000));

    const ride = await RideBooking.create({
      rider: riderProfile._id,
      pickup: { address: pickup.address, lat: route.pickupCoords.lat, lng: route.pickupCoords.lng },
      drop: { address: drop.address, lat: route.dropCoords.lat, lng: route.dropCoords.lng },
      rideDate,
      rideTime,
      tripType: isRoundTrip ? "ROUND_TRIP" : "ONE_WAY",
      ...(isRoundTrip ? { returnDate, returnTime } : {}),
      vehicleCategory,
      passengerCount: passengerCount || 1,
      distanceKm: route.distanceKm,
      fareBreakdown: {
        baseFare: offer.baseFare,
        driverAllowance: offer.driverAllowance,
        tollAndTaxes: 0,
        discount: 0,
      },
      totalAmount: offer.totalAmount,
      platformCommissionPercent: DEFAULT_COMMISSION_PERCENT,
      tripStartOtp,
      statusHistory: [{ status: "PAYMENT_PENDING" }],
    });

    return res.status(201).json({
      success: true,
      data: {
        rideId: ride._id,
        totalAmount: ride.totalAmount,
      },
    });
  } catch (error) {
    console.error("Create Ride Error:", error.message);
    return res.status(400).json({ success: false, message: error.message || "Could not create ride" });
  }
};

// @route   GET /api/ride/:id
// @desc    Get a single ride's current status/details (used for tracking screens)
export const getRideById = async (req, res) => {
  try {
    const riderId = await getRiderProfileId(req);
    const ride = await RideBooking.findOne({ _id: req.params.id, rider: riderId })
      .populate("assignedPartnerId", "fullName mobileNumber")
      .populate("assignedVehicleId", "vehicleName registrationNumber brand model")
      .populate("assignedDriverId", "name mobile");

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    // Driver/vehicle identity stays hidden until REVEAL_WINDOW_HOURS before
    // the trip -- see isDetailsRevealed. The rider still sees the vehicle
    // *category* (a separate, always-visible top-level field) either way.
    const data = ride.toObject();
    const rideDateTime = getRideDateTime(ride);
    data.detailsRevealed = isDetailsRevealed(ride);
    data.detailsRevealAt = rideDateTime
      ? new Date(rideDateTime.getTime() - REVEAL_WINDOW_HOURS * 60 * 60 * 1000)
      : null;
    if (!data.detailsRevealed) {
      data.assignedDriverId = null;
      data.assignedVehicleId = null;
      data.assignedPartnerId = null;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get Ride By Id Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/ride/my
// @desc    List the authenticated rider's rides (for My Trips)
export const getMyRides = async (req, res) => {
  try {
    const riderId = await getRiderProfileId(req);
    const { status } = req.query;

    const filter = { rider: riderId };
    if (status === "upcoming") {
      filter.status = { $in: ["PAID", "AWAITING_ASSIGNMENT", "ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"] };
    } else if (status === "completed") {
      filter.status = "COMPLETED";
    } else if (status === "cancelled") {
      filter.status = "CANCELLED";
    }

    const rides = await RideBooking.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rides });
  } catch (error) {
    console.error("Get My Rides Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/ride/:id/cancel
// @desc    Rider cancels their own ride (only before it's accepted by a partner)
export const cancelRide = async (req, res) => {
  try {
    const riderId = await getRiderProfileId(req);
    const ride = await RideBooking.findOne({ _id: req.params.id, rider: riderId });

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (!["PAID", "AWAITING_ASSIGNMENT"].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Ride can no longer be cancelled" });
    }

    ride.status = "CANCELLED";
    ride.cancelReason = req.body?.reason || "Cancelled by rider";
    ride.statusHistory.push({ status: "CANCELLED", note: ride.cancelReason });
    await ride.save();

    return res.status(200).json({ success: true, message: "Ride cancelled" });
  } catch (error) {
    console.error("Cancel Ride Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Internal helper (used by payment.controller.js after successful PayU payment)
// to release a paid ride to the eligible partner pool + notify them.
export async function releaseRideToPartnerPool(ride) {
  const vehicles = await PartnerVehicle.find({
    status: "Active",
    isDeleted: false,
    category: ride.vehicleCategory,
  }).lean();

  const partnerIds = [...new Set(vehicles.map((v) => String(v.partnerId)))];
  // Only online partners get pinged -- an offline partner can't act on the
  // notification anyway, and this is the same isOnline field the app's own
  // "Go Online/Offline" toggle already maintains.
  const profiles = await PartnerProfile.find({ _id: { $in: partnerIds }, isOnline: true }).lean();

  const authIds = profiles.map((p) => String(p.authId));
  const settingsList = authIds.length
    ? await PartnerSettings.find({ authId: { $in: authIds } }).lean()
    : [];
  const settingsByAuthId = new Map(settingsList.map((s) => [String(s.authId), s]));

  const vehiclesByPartnerId = new Map();
  for (const v of vehicles) {
    const key = String(v.partnerId);
    if (!vehiclesByPartnerId.has(key)) vehiclesByPartnerId.set(key, []);
    vehiclesByPartnerId.get(key).push(v);
  }

  // Also require the partner to have a category-matching vehicle whose
  // configured working location covers this ride's pickup city -- the same
  // servicability check computeCategoryOffers already uses for fare quotes.
  const eligibleProfiles = profiles.filter((profile) => {
    const settings = settingsByAuthId.get(String(profile.authId));
    if (!settings) return false;
    const partnerVehicles = vehiclesByPartnerId.get(String(profile._id)) || [];
    return partnerVehicles.some((vehicle) => {
      const vehicleConfig = (settings.vehicleConfigs || []).find(
        (c) => String(c.vehicleId) === String(vehicle._id)
      );
      if (!vehicleConfig) return false;
      return (vehicleConfig.locations || []).some((loc) => cityMatches(ride.pickup.address, loc.city));
    });
  });

  await notifyPartnersAboutRide(ride, eligibleProfiles);
}

// Shared notify step used both by the automatic pool broadcast above and by
// the admin's manual "broadcast to selected partners" action -- same
// notification content either way, just a different partner list feeding in.
export async function notifyPartnersAboutRide(ride, profiles) {
  for (const profile of profiles) {
    await notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title: "New ride available",
      message: `${ride.pickup.address} → ${ride.drop.address} • ₹${ride.totalAmount}`,
      type: "Trip", // matches mbconnect's existing InboxScreen icon mapping
      data: { rideId: ride._id },
      pushToken: profile.pushToken,
    });
  }
}
