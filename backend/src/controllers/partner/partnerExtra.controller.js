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
import PartnerWalletTransaction from "../../models/partner/PartnerWalletTransaction.js";
import { cityMatches, isWithin24h, isDetailsRevealed, getRideDateTime, REVEAL_WINDOW_HOURS } from "../../controllers/ride.controller.js";
import mongoose from "mongoose";
import { getRidePartnerEarning } from "../../services/rideFare.service.js";
import { computeExtraTimeCharge, istDateTime, CITY_PRICING_MODE } from "../../services/cityFare.service.js";

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
      .populate("assignedDriverId", "name")
      .sort({ createdAt: -1 });

    const data = rides.map((ride) => {
      // Rider's name/phone stay hidden until REVEAL_WINDOW_HOURS before the
      // trip -- everything else (pickup/drop, timing, fare) the partner
      // already saw in the available-rides pool before accepting, so it
      // stays visible regardless.
      const revealed = isDetailsRevealed(ride);
      const rideDateTime = getRideDateTime(ride);

      return {
        id: String(ride._id),
        tripId: `MB-${String(ride._id).slice(-6).toUpperCase()}`,
        pickupLocation: ride.pickup.address,
        dropoffLocation: ride.drop.address,
        // Coordinates, additive alongside the address strings above -- lets
        // the app render a small static map card for this trip.
        pickupCoords: { lat: ride.pickup.lat, lng: ride.pickup.lng },
        dropCoords: { lat: ride.drop.lat, lng: ride.drop.lng },
        pickupTime: ride.rideTime,
        date: ride.rideDate,
        fare: ride.totalAmount,
        status: toPartnerStatus(ride.status),
        // Raw RideBooking status, additive alongside the collapsed `status`
        // above -- lets the app tell ACCEPTED/DRIVER_EN_ROUTE/ARRIVED apart
        // (all shown as "Scheduled") so it knows which trip action to offer.
        rawStatus: ride.status,
        customerName: revealed ? ride.rider?.fullName || "Rider" : "",
        customerPhone: revealed ? ride.rider?.mobileNumber || "" : "",
        customerDetailsRevealed: revealed,
        customerDetailsRevealAt: rideDateTime
          ? new Date(rideDateTime.getTime() - REVEAL_WINDOW_HOURS * 60 * 60 * 1000)
          : null,
        vehicleName: ride.assignedVehicleId
          ? `${ride.assignedVehicleId.brand} ${ride.assignedVehicleId.model}`
          : "",
        vehicleReg: ride.assignedVehicleId?.registrationNumber || "",
        driverName: ride.assignedDriverId?.name || "",
        tripType: ride.pricingMode === CITY_PRICING_MODE ? "City" : "Outstation",
        distance: `${ride.distanceKm} km`,
        // Additive: round-trip details for the city round-trip steps.
        rideTripType: ride.tripType,
        returnDate: ride.returnDate || null,
        returnTime: ride.returnTime || null,
        pricingMode: ride.pricingMode || null,
        isCityRoundTrip: ride.pricingMode === CITY_PRICING_MODE && ride.tripType === "ROUND_TRIP",
        roundTripTimeline: ride.roundTripTimeline || null,
        extraTime: ride.extraTime?.status
          ? {
              freeWaitingMin: ride.extraTime.freeWaitingMin,
              waitingChargePerMin: ride.extraTime.waitingChargePerMin,
              extraMinutes: ride.extraTime.extraMinutes || 0,
              totalAmount: ride.extraTime.totalAmount || 0,
              partnerPayout: ride.extraTime.partnerPayout || 0,
              status: ride.extraTime.status,
            }
          : null,
      };
    });

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

    // rideDate/rideTime are immutable once a ride is created (no edit-ride
    // feature exists), so reading them ahead of the atomic accept below is
    // race-safe -- only the AWAITING_ASSIGNMENT -> ACCEPTED transition
    // itself needs the atomic guard.
    const rideBeforeAccept = await RideBooking.findById(req.params.id).select("rideDate rideTime");
    const willRevealImmediately = rideBeforeAccept ? isWithin24h(rideBeforeAccept) : false;

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
          // If the trip is already within the reveal window at acceptance
          // time, this notification below carries full details immediately,
          // so the later reveal cron has nothing left to announce for this
          // ride -- mark it done now to avoid a redundant second notification.
          detailsRevealNotified: willRevealImmediately,
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

      const message = willRevealImmediately
        ? (driver
            ? `${driver.name} is on the way in a ${vehicleLabel}.`
            : `Your ride partner is getting ready in a ${vehicleLabel}.`)
        : `A partner has been assigned to your ${ride.vehicleCategory} booking. Driver & vehicle details will be shared ${REVEAL_WINDOW_HOURS} hours before your trip.`;

      await notifyUser({
        recipientType: "Rider",
        recipientId: riderProfile._id,
        title: "Partner Assigned!",
        message,
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

// Only one legal next step per current status -- rejects skipping a step
// (e.g. ACCEPTED straight to COMPLETED) or moving backward.
const NEXT_STATUS = {
  ACCEPTED: "DRIVER_EN_ROUTE",
  DRIVER_EN_ROUTE: "ARRIVED",
  ARRIVED: "ONGOING",
  ONGOING: "COMPLETED",
};

const EARTH_RADIUS_KM = 6371;
function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// @desc    Update Trip Status
// @route   PATCH /api/partner/bookings/:id/status
export const updateBookingStatus = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { id } = req.params;
    const { status, otpCode, lat, lng } = req.body;

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

    if (NEXT_STATUS[ride.status] !== status) {
      return res.status(409).json({ success: false, message: `Cannot move from ${ride.status} to ${status}.` });
    }

    // DRIVER_EN_ROUTE/ARRIVED both require the rider's contact details to
    // already be revealed -- otherwise the partner would have no way to
    // actually reach the rider despite claiming to be en route or arrived.
    if ((status === "DRIVER_EN_ROUTE" || status === "ARRIVED") && !isDetailsRevealed(ride)) {
      return res.status(403).json({
        success: false,
        message: "Rider contact details aren't available yet -- check back closer to the trip.",
      });
    }

    if (status === "ARRIVED") {
      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ success: false, message: "Location is required to mark arrival." });
      }
      if (distanceKm(lat, lng, ride.pickup.lat, ride.pickup.lng) > 5) {
        return res.status(403).json({
          success: false,
          message: "You need to be within 5 km of the pickup location to mark arrival.",
        });
      }
    }

    // status values coming from the partner app: DRIVER_EN_ROUTE | ARRIVED | ONGOING | COMPLETED
    if (status === "ONGOING") {
      if (!otpCode || otpCode !== ride.tripStartOtp) {
        return res.status(400).json({ success: false, message: "Invalid Customer OTP verification code." });
      }
    }

    // City round trips: once "Reached destination" is marked, the return
    // start must be marked before completing (it's what extra time is
    // measured from). Rides that never used these steps complete as before.
    const isCityRoundTrip = ride.pricingMode === CITY_PRICING_MODE && ride.tripType === "ROUND_TRIP";
    if (status === "COMPLETED" && isCityRoundTrip && ride.roundTripTimeline?.reachedDestinationAt && !ride.roundTripTimeline?.returnStartedAt) {
      return res.status(409).json({ success: false, message: "Please mark 'Start return trip' before completing this trip." });
    }

    ride.status = status;
    ride.statusHistory.push({ status });

    // City round trips: charge time past the booked return (+ free minutes).
    let extraDue = null;
    if (status === "COMPLETED" && isCityRoundTrip && ride.roundTripTimeline?.returnStartedAt && ride.extraTime) {
      const charge = computeExtraTimeCharge({
        bookedReturnAt: istDateTime(ride.returnDate, ride.returnTime),
        returnStartedAt: ride.roundTripTimeline.returnStartedAt,
        freeWaitingMin: ride.extraTime.freeWaitingMin,
        waitingChargePerMin: ride.extraTime.waitingChargePerMin,
        taxPercent: ride.extraTime.taxPercent,
        commissionPercent: ride.extraTime.commissionPercent,
      });
      ride.extraTime = {
        ...(ride.extraTime.toObject ? ride.extraTime.toObject() : ride.extraTime),
        ...charge,
        status: charge.totalAmount > 0 ? "DUE" : "NONE",
        computedAt: new Date(),
      };
      if (charge.totalAmount > 0) extraDue = charge;
    }

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
      // Same formula as before for existing rides; admin-priced rides use the
      // commission/payout fixed at booking (see getRidePartnerEarning).
      const { netEarning } = getRidePartnerEarning(ride);
      // Lands in the pending bucket, not the spendable balance -- only an
      // admin manually releasing it (see admin wallet routes) moves it into
      // walletBalance. No automatic timer; the 24h message below is
      // driver-facing only.
      profile.pendingWalletBalance = (profile.pendingWalletBalance || 0) + netEarning;
      await profile.save();

      await PartnerWalletTransaction.create({
        partnerId: authId,
        type: "trip_pending_credit",
        amount: netEarning,
        walletBalanceAfter: profile.walletBalance || 0,
        pendingWalletBalanceAfter: profile.pendingWalletBalance,
        bookingId: ride._id,
        note: `Trip #MB-${String(ride._id).slice(-6).toUpperCase()} completed`,
      });

      await notifyUser({
        recipientType: "Partner",
        recipientId: profile._id,
        title: "Trip Fare Pending",
        message: `₹${netEarning.toLocaleString("en-IN")} for trip #MB-${String(ride._id).slice(-6).toUpperCase()} will be added to your wallet within 24 hours.`,
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

      if (extraDue && riderProfile) {
        await notifyUser({
          recipientType: "Rider",
          recipientId: riderProfile._id,
          title: "Extra time charges due",
          message: `Your return started ${extraDue.extraMinutes} min after the free waiting time. Please pay ₹${extraDue.totalAmount.toLocaleString("en-IN")} (incl. GST) in My Trips.`,
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

// @desc    City round trips: mark "Reached destination" / "Start return trip"
// @route   PATCH /api/partner/bookings/:id/round-trip
// @body    { event: "REACHED_DESTINATION" | "RETURN_STARTED", lat?, lng? }
export const markRoundTripEvent = async (req, res) => {
  try {
    const { event, lat, lng } = req.body || {};
    if (!["REACHED_DESTINATION", "RETURN_STARTED"].includes(event)) {
      return res.status(400).json({ success: false, message: "Invalid event." });
    }
    const profile = await PartnerProfile.findOne({ authId: req.partnerId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const ride = await RideBooking.findOne({ _id: req.params.id, assignedPartnerId: profile._id });
    if (!ride) return res.status(404).json({ success: false, message: "Booking not found." });

    if (ride.pricingMode !== CITY_PRICING_MODE || ride.tripType !== "ROUND_TRIP") {
      return res.status(400).json({ success: false, message: "This step is only for city round trips." });
    }
    if (ride.status !== "ONGOING") {
      return res.status(409).json({ success: false, message: "Start the trip first." });
    }

    const timeline = ride.roundTripTimeline || {};
    if (event === "REACHED_DESTINATION") {
      if (timeline.reachedDestinationAt) {
        return res.status(409).json({ success: false, message: "Already marked as reached." });
      }
      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ success: false, message: "Location is required to mark reached." });
      }
      if (Number.isFinite(ride.drop?.lat) && Number.isFinite(ride.drop?.lng) && distanceKm(lat, lng, ride.drop.lat, ride.drop.lng) > 5) {
        return res.status(403).json({ success: false, message: "You need to be within 5 km of the destination to mark reached." });
      }
      ride.roundTripTimeline = { ...timeline, reachedDestinationAt: new Date() };
      ride.statusHistory.push({ status: "ONGOING", note: "Reached destination" });
    } else {
      if (!timeline.reachedDestinationAt) {
        return res.status(409).json({ success: false, message: "Mark 'Reached destination' first." });
      }
      if (timeline.returnStartedAt) {
        return res.status(409).json({ success: false, message: "Return trip already started." });
      }
      ride.roundTripTimeline = { ...timeline, returnStartedAt: new Date() };
      ride.statusHistory.push({ status: "ONGOING", note: "Return trip started" });
    }
    await ride.save();

    const riderProfile = await RiderProfile.findById(ride.rider);
    if (riderProfile) {
      await notifyUser({
        recipientType: "Rider",
        recipientId: riderProfile._id,
        title: event === "REACHED_DESTINATION" ? "Reached your destination" : "Return trip started",
        message:
          event === "REACHED_DESTINATION"
            ? `Your driver will wait for your return at ${ride.returnTime}. ${ride.extraTime?.freeWaitingMin || 0} min free after that.`
            : "You're on the way back. Have a safe ride!",
        type: "Trip",
        data: { rideId: ride._id },
        pushToken: riderProfile.pushToken,
      });
    }

    return res.status(200).json({ success: true, bookingId: ride._id, roundTripTimeline: ride.roundTripTimeline });
  } catch (error) {
    console.error("Round Trip Event Error:", error);
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

    // For rides priced the original way these are exactly the previous
    // numbers (platformAndTaxes is 0); admin-priced rides also separate out
    // the platform charges/taxes that aren't partner money.
    const earnings = completedRides.map((r) => getRidePartnerEarning(r));
    const grossTripFare = completedRides.reduce((sum, r) => sum + r.totalAmount, 0);
    const platformCommission = earnings.reduce((sum, e) => sum + e.commission, 0);
    const taxes = earnings.reduce((sum, e) => sum + e.platformAndTaxes, 0);
    const totalNetEarnings = grossTripFare - platformCommission - taxes;

    const dayTotals = new Map();
    completedRides.forEach((ride, i) => {
      const day = ride.updatedAt.toLocaleDateString("en-IN", { weekday: "short" });
      dayTotals.set(day, (dayTotals.get(day) || 0) + earnings[i].netEarning);
    });
    const chartData = Array.from(dayTotals.entries()).map(([day, amount]) => ({ day, amount }));

    return res.status(200).json({
      success: true,
      data: {
        timeframe,
        totalNetEarnings,
        grossTripFare,
        platformCommission,
        taxes,
        growthPercent: 0,
        chartData,
        recentPayouts: [],
        availableBalance: profile.walletBalance || 0,
        pendingBalance: profile.pendingWalletBalance || 0,
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
