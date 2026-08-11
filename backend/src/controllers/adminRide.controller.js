import { RideBooking } from "../models/RideBooking.js";
import { Notification } from "../models/Notification.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerVehicle from "../models/partner/PartnerVehicle.js";
import { PartnerSettings } from "../models/partner/PartnerSettings.js";
import { releaseRideToPartnerPool, notifyPartnersAboutRide, getBroadcastExpiry, cityMatches } from "./ride.controller.js";
import { sendPushNotification } from "../utils/notifications.js";

// @route   GET /api/admin/rides
// @desc    List ride bookings for the admin management view, optionally filtered by status
export const getAllRides = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const rides = await RideBooking.find(filter)
      .populate("rider", "fullName mobileNumber")
      .populate("assignedPartnerId", "fullName mobileNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, total: rides.length, data: rides });
  } catch (error) {
    console.error("Admin Get All Rides Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/rides/:id
export const getRideDetail = async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate("rider", "fullName mobileNumber")
      .populate("assignedPartnerId", "fullName mobileNumber")
      .populate("assignedVehicleId", "vehicleName registrationNumber brand model")
      .populate("assignedDriverId", "fullName mobileNumber");

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    return res.status(200).json({ success: true, data: ride });
  } catch (error) {
    console.error("Admin Get Ride Detail Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/rides/:id/eligible-partners
// @desc    List every partner with at least one active vehicle, with computed
//          match flags (category/location/online) against this ride, plus
//          optional query-param filters (category, city, onlineOnly) so the
//          admin's manual picker can narrow the list before broadcasting or
//          directly assigning. Read-only -- doesn't touch the ride.
export const getEligiblePartners = async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id).lean();
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    const { category, city, onlineOnly } = req.query;

    const vehicleFilter = { status: "Active", isDeleted: false };
    if (category) vehicleFilter.category = category;
    const vehicles = await PartnerVehicle.find(vehicleFilter).lean();

    const partnerIds = [...new Set(vehicles.map((v) => String(v.partnerId)))];
    if (partnerIds.length === 0) {
      return res.status(200).json({ success: true, total: 0, data: [] });
    }

    const profileFilter = { _id: { $in: partnerIds } };
    if (onlineOnly === "true") profileFilter.isOnline = true;
    const profiles = await PartnerProfile.find(profileFilter).lean();

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

    const cityFilter = city || ride.pickup?.address;

    let data = profiles.map((profile) => {
      const partnerVehicles = vehiclesByPartnerId.get(String(profile._id)) || [];
      const settings = settingsByAuthId.get(String(profile.authId));
      const workingCities = new Set();
      let matchesLocation = false;

      for (const vehicle of partnerVehicles) {
        const vehicleConfig = (settings?.vehicleConfigs || []).find(
          (c) => String(c.vehicleId) === String(vehicle._id)
        );
        for (const loc of vehicleConfig?.locations || []) {
          if (loc.city) workingCities.add(loc.city);
          if (cityFilter && cityMatches(cityFilter, loc.city)) matchesLocation = true;
        }
      }

      return {
        partnerId: profile._id,
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber,
        isOnline: !!profile.isOnline,
        vehicles: partnerVehicles.map((v) => ({
          vehicleId: v._id,
          category: v.category,
          vehicleName: `${v.brand} ${v.model}`,
          registrationNumber: v.registrationNumber,
        })),
        workingCities: [...workingCities],
        matchesCategory: partnerVehicles.some((v) => v.category === ride.vehicleCategory),
        matchesLocation,
      };
    });

    // City is a computed match, not a DB-level filter (it depends on each
    // partner's per-vehicle configured locations) -- apply it last.
    if (city) {
      data = data.filter((p) => p.matchesLocation);
    }

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error("Admin Get Eligible Partners Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/rides/:id/broadcast
// @desc    Notify a specific, admin-chosen set of partners about this ride
//          (instead of the full auto-matched pool) and reset the broadcast window.
export const broadcastToPartners = async (req, res) => {
  try {
    const { partnerIds } = req.body;
    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      return res.status(400).json({ success: false, message: "partnerIds (non-empty array) is required" });
    }

    const ride = await RideBooking.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    if (!["PAID", "AWAITING_ASSIGNMENT"].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Only paid, unassigned rides can be broadcast" });
    }

    const profiles = await PartnerProfile.find({ _id: { $in: partnerIds } }).lean();

    ride.status = "AWAITING_ASSIGNMENT";
    ride.broadcastExpiresAt = getBroadcastExpiry();
    ride.needsManualAssignment = false;
    ride.statusHistory.push({ status: "AWAITING_ASSIGNMENT", note: `Broadcast by admin to ${profiles.length} selected partner(s)` });
    await ride.save();

    await notifyPartnersAboutRide(ride, profiles);

    return res.status(200).json({ success: true, message: `Ride broadcast to ${profiles.length} selected partner(s)` });
  } catch (error) {
    console.error("Admin Broadcast Ride Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/rides/:id/assign
// @desc    Directly assign this ride to one specific partner + vehicle, skipping the pool entirely.
export const assignRideToPartner = async (req, res) => {
  try {
    const { partnerId, vehicleId } = req.body;
    if (!partnerId || !vehicleId) {
      return res.status(400).json({ success: false, message: "partnerId and vehicleId are required" });
    }

    const ride = await RideBooking.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    if (!["PAID", "AWAITING_ASSIGNMENT"].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Only paid, unassigned rides can be assigned" });
    }

    const vehicle = await PartnerVehicle.findOne({
      _id: vehicleId,
      partnerId,
      status: "Active",
      isDeleted: false,
    });
    if (!vehicle) {
      return res.status(400).json({ success: false, message: "Vehicle not found for this partner, or not Active" });
    }
    if (vehicle.category !== ride.vehicleCategory) {
      return res.status(400).json({ success: false, message: `Vehicle category (${vehicle.category}) does not match the ride's requested category (${ride.vehicleCategory})` });
    }

    const profile = await PartnerProfile.findById(partnerId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    ride.status = "ACCEPTED";
    ride.assignedPartnerId = profile._id;
    ride.assignedVehicleId = vehicle._id;
    ride.assignedDriverId = vehicle.assignedDriverId;
    ride.broadcastExpiresAt = undefined;
    ride.needsManualAssignment = false;
    ride.statusHistory.push({ status: "ACCEPTED", note: `Directly assigned by admin to partner ${profile._id}` });
    await ride.save();

    await Notification.create({
      recipientType: "Partner",
      recipientId: profile._id,
      title: "Ride assigned to you",
      message: `${ride.pickup.address} → ${ride.drop.address} • ₹${ride.totalAmount}`,
      type: "Trip",
      data: { rideId: ride._id },
    });
    if (profile.pushToken) {
      await sendPushNotification(
        profile.pushToken,
        "Ride assigned to you",
        `${ride.pickup.address} → ${ride.drop.address} • ₹${ride.totalAmount}`,
        { rideId: String(ride._id) }
      );
    }

    return res.status(200).json({ success: true, message: "Ride assigned" });
  } catch (error) {
    console.error("Admin Assign Ride Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/rides/:id/release
// @desc    Release a PAID ride to the eligible partner pool (re-broadcast if already awaiting)
export const releaseRide = async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (!["PAID", "AWAITING_ASSIGNMENT"].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Only paid, unassigned rides can be released" });
    }

    ride.status = "AWAITING_ASSIGNMENT";
    ride.broadcastExpiresAt = getBroadcastExpiry();
    ride.needsManualAssignment = false;
    ride.statusHistory.push({ status: "AWAITING_ASSIGNMENT", note: "Released by admin" });
    await ride.save();

    await releaseRideToPartnerPool(ride);

    return res.status(200).json({ success: true, message: "Ride released to eligible partners" });
  } catch (error) {
    console.error("Admin Release Ride Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/admin/rides/:id/reassign
// @desc    Clear the current assignment and move an ACCEPTED ride back to
//          AWAITING_ASSIGNMENT (support/dispute handling). Does NOT
//          auto-broadcast -- the admin picks who to notify/assign next via
//          the eligible-partners picker (broadcast/assign endpoints above).
export const reassignRide = async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    ride.assignedPartnerId = undefined;
    ride.assignedVehicleId = undefined;
    ride.assignedDriverId = undefined;
    ride.status = "AWAITING_ASSIGNMENT";
    ride.broadcastExpiresAt = undefined;
    ride.needsManualAssignment = false;
    ride.statusHistory.push({ status: "AWAITING_ASSIGNMENT", note: "Reassigned by admin" });
    await ride.save();

    return res.status(200).json({ success: true, message: "Assignment cleared, ride is back in the pool" });
  } catch (error) {
    console.error("Admin Reassign Ride Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/admin/rides/:id/cancel
export const adminCancelRide = async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    ride.status = "CANCELLED";
    ride.cancelReason = req.body?.reason || "Cancelled by admin";
    ride.statusHistory.push({ status: "CANCELLED", note: ride.cancelReason });
    await ride.save();

    const riderProfile = await RiderProfile.findById(ride.rider);
    if (riderProfile) {
      await Notification.create({
        recipientType: "Rider",
        recipientId: riderProfile._id,
        title: "Ride cancelled",
        message: `Your ride from ${ride.pickup.address} to ${ride.drop.address} was cancelled by support.`,
        type: "Ride",
        data: { rideId: ride._id },
      });
      if (riderProfile.pushToken) {
        await sendPushNotification(
          riderProfile.pushToken,
          "Ride cancelled",
          `Your ride from ${ride.pickup.address} to ${ride.drop.address} was cancelled by support.`,
          { rideId: String(ride._id) }
        );
      }
    }

    return res.status(200).json({ success: true, message: "Ride cancelled" });
  } catch (error) {
    console.error("Admin Cancel Ride Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
