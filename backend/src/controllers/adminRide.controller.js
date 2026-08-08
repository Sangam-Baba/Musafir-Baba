import { RideBooking } from "../models/RideBooking.js";
import { Notification } from "../models/Notification.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import { releaseRideToPartnerPool } from "./ride.controller.js";
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
// @desc    Manually move an ACCEPTED ride back to the pool (support/dispute handling)
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
    ride.statusHistory.push({ status: "AWAITING_ASSIGNMENT", note: "Reassigned by admin" });
    await ride.save();

    await releaseRideToPartnerPool(ride);

    return res.status(200).json({ success: true, message: "Ride reassigned to the partner pool" });
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
