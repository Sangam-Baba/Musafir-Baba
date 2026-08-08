import crypto from "crypto";
import { RideBooking } from "../models/RideBooking.js";
import { Notification } from "../models/Notification.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import PartnerVehicle from "../models/partner/PartnerVehicle.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import { PartnerSettings } from "../models/partner/PartnerSettings.js";
import { getRouteDistance, searchAddressSuggestions, reverseGeocode } from "../services/geo.service.js";
import { sendPushNotification } from "../utils/notifications.js";

const FLAT_DRIVER_ALLOWANCE = 100;
const DEFAULT_COMMISSION_PERCENT = 15;

// req.riderId (from the JWT) is the RiderAuth id; RideBooking.rider references
// RiderProfile, so resolve the profile id once and reuse it (mirrors how the
// partner controllers resolve PartnerProfile from req.partnerId/authId).
async function getRiderProfileId(req) {
  const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id").lean();
  return riderProfile?._id || null;
}

// Matches a free-text address like "New Delhi, Delhi" against a serviceable city name.
function cityMatches(address, city) {
  if (!address || !city) return false;
  return address.toLowerCase().includes(city.toLowerCase());
}

// For a given distance + pickup/drop, find the cheapest eligible offer per vehicle category
// by matching Active PartnerVehicles to their PartnerSettings rate + serviceable locations.
async function computeCategoryOffers(pickupAddress, dropAddress, distanceKm) {
  const vehicles = await PartnerVehicle.find({ status: "Active", isDeleted: false }).lean();
  if (vehicles.length === 0) return [];

  const partnerIds = [...new Set(vehicles.map((v) => String(v.partnerId)))];
  const profiles = await PartnerProfile.find({ _id: { $in: partnerIds } }).lean();
  const profileById = new Map(profiles.map((p) => [String(p._id), p]));

  const authIds = profiles.map((p) => String(p.authId));
  const settingsList = await PartnerSettings.find({ authId: { $in: authIds } }).lean();
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

    const serviceable = (vehicleConfig.locations || []).some(
      (loc) => cityMatches(pickupAddress, loc.city) || cityMatches(dropAddress, loc.city)
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

    const { pickup, drop, rideDate, rideTime, vehicleCategory, passengerCount } = req.body;

    if (!pickup?.address || !drop?.address || !rideDate || !rideTime || !vehicleCategory) {
      return res.status(400).json({ success: false, message: "Missing required ride details" });
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
      .populate("assignedDriverId", "fullName mobileNumber");

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    return res.status(200).json({ success: true, data: ride });
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
  const profiles = await PartnerProfile.find({ _id: { $in: partnerIds } }).lean();

  for (const profile of profiles) {
    await Notification.create({
      recipientType: "Partner",
      recipientId: profile._id,
      title: "New ride available",
      message: `${ride.pickup.address} → ${ride.drop.address} • ₹${ride.totalAmount}`,
      type: "Trip", // matches mbconnect's existing InboxScreen icon mapping
      data: { rideId: ride._id },
    });

    if (profile.pushToken) {
      await sendPushNotification(
        profile.pushToken,
        "New ride available",
        `${ride.pickup.address} → ${ride.drop.address} • ₹${ride.totalAmount}`,
        { rideId: String(ride._id) }
      );
    }
  }
}
