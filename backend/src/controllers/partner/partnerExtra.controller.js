import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import RiderProfile from "../../models/rider/RiderProfile.js";
import { PartnerSettings } from "../../models/partner/PartnerSettings.js";
import { RideBooking } from "../../models/RideBooking.js";
import { Notification } from "../../models/Notification.js";
import { notifyUser } from "../../services/notification/notificationService.js";
import { createTokenRequest } from "../../services/notification/transport.js";
import { cityMatches } from "../../controllers/ride.controller.js";
import mongoose from "mongoose";

// @desc    Toggle partner's active duty status (online/offline)
// @route   PATCH /api/partner/status
export const updateStatus = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { isOnline } = req.body;

    if (isOnline === undefined) {
      return res.status(400).json({ success: false, message: "isOnline status is required." });
    }

    const profile = await PartnerProfile.findOneAndUpdate(
      { authId },
      { $set: { isOnline } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    return res.status(200).json({
      success: true,
      isOnline: profile.isOnline,
      message: `Duty status updated to ${profile.isOnline ? "Online" : "Offline"}.`,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Maps the internal RideBooking status enum to the partner app's display status.
function toPartnerStatus(rideStatus) {
  if (rideStatus === "ONGOING") return "Ongoing";
  if (["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED"].includes(rideStatus)) return "Scheduled";
  if (rideStatus === "COMPLETED") return "Completed";
  if (rideStatus === "CANCELLED") return "Cancelled";
  return "Scheduled";
}

function toRideBookingForTab(tab) {
  if (tab === "Ongoing") return ["ONGOING"];
  if (tab === "Scheduled") return ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED"];
  if (tab === "Completed") return ["COMPLETED"];
  if (tab === "Cancelled") return ["CANCELLED"];
  return ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING", "COMPLETED", "CANCELLED"];
}

// @desc    List bookings assigned to the partner's registered vehicles
// @route   GET /api/partner/bookings
export const getBookings = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const tab = req.query.tab || "Ongoing";
    const rides = await RideBooking.find({
      assignedPartnerId: profile._id,
      status: { $in: toRideBookingForTab(tab) },
    })
      .populate("rider", "fullName mobileNumber")
      .populate("assignedVehicleId", "vehicleName registrationNumber brand model")
      .populate("assignedDriverId", "fullName")
      .sort({ createdAt: -1 });

    const data = rides.map((ride) => ({
      id: String(ride._id),
      tripId: `MB-${String(ride._id).slice(-6).toUpperCase()}`,
      pickupLocation: ride.pickup.address,
      dropoffLocation: ride.drop.address,
      pickupTime: ride.rideTime,
      date: ride.rideDate,
      fare: ride.totalAmount,
      status: toPartnerStatus(ride.status),
      customerName: ride.rider?.fullName || "Rider",
      customerPhone: ride.rider?.mobileNumber || "",
      vehicleName: ride.assignedVehicleId
        ? `${ride.assignedVehicleId.brand} ${ride.assignedVehicleId.model}`
        : "",
      vehicleReg: ride.assignedVehicleId?.registrationNumber || "",
      driverName: ride.assignedDriverId?.fullName || "",
      tripType: "Outstation",
      distance: `${ride.distanceKm} km`,
    }));

    return res.status(200).json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Get Bookings Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    List rides awaiting assignment that this partner is eligible for (by vehicle category)
// @route   GET /api/partner/rides/available
export const getAvailableRides = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    // Offline partners shouldn't see the pool at all -- matches the "Go
    // online to start receiving bookings" messaging already on Home.
    if (!profile.isOnline) {
      return res.status(200).json({ success: true, total: 0, data: [] });
    }

    const vehicles = await PartnerVehicle.find({
      partnerId: profile._id,
      status: "Active",
      isDeleted: false,
    }).lean();
    const categories = [...new Set(vehicles.map((v) => v.category))];

    const settings = await PartnerSettings.findOne({ authId: profile.authId }).lean();
    const vehicleConfigByVehicleId = new Map(
      (settings?.vehicleConfigs || []).map((c) => [String(c.vehicleId), c])
    );

    const candidateRides = await RideBooking.find({
      status: "AWAITING_ASSIGNMENT",
      vehicleCategory: { $in: categories },
    }).sort({ createdAt: -1 });

    // A ride is only shown if at least one of this partner's active vehicles
    // of the matching category has a configured working location covering
    // the ride's pickup city -- same servicability rule computeCategoryOffers
    // already uses for fare quotes.
    const rides = candidateRides.filter((ride) => {
      const matchingVehicles = vehicles.filter((v) => v.category === ride.vehicleCategory);
      return matchingVehicles.some((vehicle) => {
        const vehicleConfig = vehicleConfigByVehicleId.get(String(vehicle._id));
        if (!vehicleConfig) return false;
        return (vehicleConfig.locations || []).some((loc) => cityMatches(ride.pickup.address, loc.city));
      });
    });

    const data = rides.map((ride) => ({
      id: String(ride._id),
      pickupLocation: ride.pickup.address,
      dropoffLocation: ride.drop.address,
      pickupTime: ride.rideTime,
      date: ride.rideDate,
      fare: ride.totalAmount,
      vehicleCategory: ride.vehicleCategory,
      distance: `${ride.distanceKm} km`,
    }));

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error("Get Available Rides Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Accept an available ride (first partner to accept wins, atomically)
// @route   POST /api/partner/rides/:id/accept
export const acceptRide = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const vehicle = await PartnerVehicle.findOne({
      partnerId: profile._id,
      status: "Active",
      isDeleted: false,
    });
    if (!vehicle) {
      return res.status(400).json({ success: false, message: "You need an active, approved vehicle to accept rides." });
    }

    // Atomic guard: only succeeds if the ride is still awaiting assignment.
    // Whichever partner's request lands first wins; everyone else gets the message below.
    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, status: "AWAITING_ASSIGNMENT" },
      {
        $set: {
          status: "ACCEPTED",
          assignedPartnerId: profile._id,
          assignedVehicleId: vehicle._id,
          assignedDriverId: vehicle.assignedDriverId,
        },
        $push: { statusHistory: { status: "ACCEPTED", note: `Accepted by partner ${profile._id}` } },
      },
      { new: true }
    );

    if (!ride) {
      return res.status(409).json({ success: false, message: "This ride has already been accepted by another partner." });
    }

    const riderProfile = await RiderProfile.findById(ride.rider);
    if (riderProfile) {
      const driver = vehicle.assignedDriverId ? await PartnerDriver.findById(vehicle.assignedDriverId) : null;
      const vehicleLabel = `${vehicle.color ? vehicle.color + " " : ""}${vehicle.vehicleName} (${vehicle.registrationNumber})`;

      await notifyUser({
        recipientType: "Rider",
        recipientId: riderProfile._id,
        title: "Partner Assigned!",
        message: driver
          ? `${driver.name} is on the way in a ${vehicleLabel}.`
          : `Your ride partner is getting ready in a ${vehicleLabel}.`,
        type: "Trip",
        data: { rideId: ride._id },
        pushToken: riderProfile.pushToken,
      });
    }

    return res.status(200).json({ success: true, message: "Ride accepted", data: { rideId: ride._id } });
  } catch (error) {
    console.error("Accept Ride Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Rider-facing copy for trip status transitions, mirrors mbgo's
// ScreenLiveTracking.tsx statusMessages verbatim so the push notification and
// the in-app screen read as one voice. COMPLETED is handled separately below
// (needs the fare amount), ACCEPTED is handled in acceptRide.
const RIDER_TRIP_STATUS_COPY = {
  DRIVER_EN_ROUTE: { title: "Partner is on the way!", message: "Your ride partner is heading to pick-up." },
  ARRIVED: { title: "Partner has arrived", message: "Your partner is waiting at the pick-up point." },
  ONGOING: { title: "Trip in progress", message: "Enjoy your ride!" },
};

// @desc    Update Trip Status
// @route   PATCH /api/partner/bookings/:id/status
export const updateBookingStatus = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { id } = req.params;
    const { status, otpCode } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const ride = await RideBooking.findOne({ _id: id, assignedPartnerId: profile._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // status values coming from the partner app: DRIVER_EN_ROUTE | ARRIVED | ONGOING | COMPLETED
    if (status === "ONGOING") {
      if (!otpCode || otpCode !== ride.tripStartOtp) {
        return res.status(400).json({ success: false, message: "Invalid Customer OTP verification code." });
      }
    }

    ride.status = status;
    ride.statusHistory.push({ status });

    const riderProfile = await RiderProfile.findById(ride.rider);

    if (riderProfile && RIDER_TRIP_STATUS_COPY[status]) {
      await notifyUser({
        recipientType: "Rider",
        recipientId: riderProfile._id,
        title: RIDER_TRIP_STATUS_COPY[status].title,
        message: RIDER_TRIP_STATUS_COPY[status].message,
        type: "Trip",
        data: { rideId: ride._id },
        pushToken: riderProfile.pushToken,
      });
    }

    if (status === "COMPLETED") {
      const commission = Math.round((ride.totalAmount * ride.platformCommissionPercent) / 100);
      const netEarning = ride.totalAmount - commission;
      profile.walletBalance = (profile.walletBalance || 0) + netEarning;
      await profile.save();

      await notifyUser({
        recipientType: "Partner",
        recipientId: profile._id,
        title: "Trip Fare Credited",
        message: `₹${netEarning.toLocaleString("en-IN")} credited to your MB Wallet for completed trip #MB-${String(ride._id).slice(-6).toUpperCase()}.`,
        type: "Trip",
        data: { rideId: ride._id },
        sendPush: false,
      });

      if (riderProfile) {
        await notifyUser({
          recipientType: "Rider",
          recipientId: riderProfile._id,
          title: "Trip completed",
          message: `Trip completed — ₹${ride.totalAmount.toLocaleString("en-IN")} charged. Thanks for riding with MBGO!`,
          type: "Trip",
          data: { rideId: ride._id },
          pushToken: riderProfile.pushToken,
        });
      }
    }

    await ride.save();

    return res.status(200).json({
      success: true,
      bookingId: id,
      updatedStatus: status,
      message: `Trip status updated successfully to ${status}.`,
    });
  } catch (error) {
    console.error("Update Booking Status Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get partner net earnings and payouts list
// @route   GET /api/partner/earnings
export const getEarnings = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const timeframe = req.query.timeframe || "Week";
    const now = new Date();
    const since = new Date(now);
    if (timeframe === "Week") since.setDate(now.getDate() - 7);
    else if (timeframe === "Month") since.setMonth(now.getMonth() - 1);
    else since.setFullYear(now.getFullYear() - 1);

    const completedRides = await RideBooking.find({
      assignedPartnerId: profile._id,
      status: "COMPLETED",
      updatedAt: { $gte: since },
    });

    const grossTripFare = completedRides.reduce((sum, r) => sum + r.totalAmount, 0);
    const platformCommission = completedRides.reduce(
      (sum, r) => sum + Math.round((r.totalAmount * r.platformCommissionPercent) / 100),
      0
    );
    const totalNetEarnings = grossTripFare - platformCommission;

    const dayTotals = new Map();
    for (const ride of completedRides) {
      const day = ride.updatedAt.toLocaleDateString("en-IN", { weekday: "short" });
      const commission = Math.round((ride.totalAmount * ride.platformCommissionPercent) / 100);
      dayTotals.set(day, (dayTotals.get(day) || 0) + (ride.totalAmount - commission));
    }
    const chartData = Array.from(dayTotals.entries()).map(([day, amount]) => ({ day, amount }));

    return res.status(200).json({
      success: true,
      data: {
        timeframe,
        totalNetEarnings,
        grossTripFare,
        platformCommission,
        taxes: 0,
        growthPercent: 0,
        chartData,
        recentPayouts: [],
      },
    });
  } catch (error) {
    console.error("Get Earnings Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Request Instant Payout
// @route   POST /api/partner/payouts/request
export const requestPayout = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid payout amount is required." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    if (profile.walletBalance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance for payout." });
    }

    profile.walletBalance = Math.max(0, profile.walletBalance - amount);
    await profile.save();

    await notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title: "Payout requested",
      message: `Your withdrawal request for ₹${amount.toLocaleString("en-IN")} has been submitted and is processing.`,
      type: "Payout",
      sendPush: false,
    });

    return res.status(201).json({
      success: true,
      payoutId: `PAY-${Date.now().toString().slice(-8)}`,
      status: "Processing",
      message: "Withdrawal request submitted successfully and is processing.",
    });
  } catch (error) {
    console.error("Request Payout Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

function toRelativeTime(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// @desc    Get partner inbox alerts feed
// @route   GET /api/partner/notifications
export const getNotifications = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const notifications = await Notification.find({
      recipientType: "Partner",
      recipientId: profile._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const data = notifications.map((n) => ({
      id: String(n._id),
      title: n.title,
      message: n.message,
      time: toRelativeTime(n.createdAt),
      type: n.type,
      read: n.read,
    }));

    return res.status(200).json({
      success: true,
      unreadCount: notifications.filter((n) => !n.read).length,
      data,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Mark notifications as read
// @route   PATCH /api/partner/notifications/mark-read
export const markNotificationsRead = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    await Notification.updateMany(
      { recipientType: "Partner", recipientId: profile._id, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read successfully.",
    });
  } catch (error) {
    console.error("Mark Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Issue a short-lived realtime auth token scoped to this partner's own notification channel
// @route   GET /api/partner/notifications/realtime-token
export const getRealtimeToken = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId }).select("_id");
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const channelName = `notifications:partner:${profile._id}`;
    const tokenRequest = await createTokenRequest(String(profile._id), channelName);

    return res.status(200).json({ success: true, data: { tokenRequest, channelName } });
  } catch (error) {
    console.error("Get Partner Realtime Token Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
