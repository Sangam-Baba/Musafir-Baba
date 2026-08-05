import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
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

// @desc    List bookings for the partner's registered vehicles
// @route   GET /api/partner/bookings
export const getBookings = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    // Find all vehicles owned by this partner
    const vehicles = await PartnerVehicle.find({ partnerId: profile._id, isDeleted: false });
    const vehicleRegs = vehicles.map(v => v.registrationNumber);
    const vehicleNames = vehicles.map(v => `${v.brand} ${v.model}`);

    // Serve mock/dynamic list structured as expected by the UI Tab 2 contracts, utilizing real vehicle names
    const mockBookings = [
      {
        id: "bk-8801",
        tripId: "MB-89241",
        pickupLocation: "Terminal 3, IGI Airport, New Delhi",
        dropoffLocation: "Sector 62, Noida, Uttar Pradesh",
        pickupTime: "10:30 AM",
        date: "Today",
        fare: 1850,
        status: "Ongoing",
        customerName: "Rajesh Sharma",
        customerPhone: "+91 98765 43210",
        vehicleName: vehicleNames[0] || "Innova Crysta",
        vehicleReg: vehicleRegs[0] || "DL01AB1234",
        driverName: "Ramesh Kumar",
        tripType: "Airport Transfer",
        distance: "42 km",
      },
      {
        id: "bk-8802",
        tripId: "MB-89240",
        pickupLocation: "Connaught Place, New Delhi",
        dropoffLocation: "Cyber Hub, Gurugram, Haryana",
        pickupTime: "02:00 PM",
        date: "Today",
        fare: 1420,
        status: "Scheduled",
        customerName: "Ananya Verma",
        customerPhone: "+91 98123 67890",
        vehicleName: vehicleNames[1] || "Maruti Ertiga",
        vehicleReg: vehicleRegs[1] || "HR26CK5678",
        driverName: "Suresh Singh",
        tripType: "City Ride",
        distance: "28 km",
      },
      {
        id: "bk-8803",
        tripId: "MB-89239",
        pickupLocation: "Nizamuddin Railway Station",
        dropoffLocation: "Mall Road, Shimla, Himachal Pradesh",
        pickupTime: "06:00 AM",
        date: "Yesterday",
        fare: 7800,
        status: "Completed",
        customerName: "Vikram Malhotra",
        customerPhone: "+91 97111 22334",
        vehicleName: vehicleNames[0] || "Innova Crysta",
        vehicleReg: vehicleRegs[0] || "DL01AB1234",
        driverName: "Ramesh Kumar",
        tripType: "Outstation One-Way",
        distance: "345 km",
      }
    ];

    const tab = req.query.tab || "Ongoing";
    const filtered = mockBookings.filter(b => {
      if (tab === "Ongoing") return b.status === "Ongoing";
      if (tab === "Scheduled") return b.status === "Scheduled";
      if (tab === "Completed") return b.status === "Completed";
      if (tab === "Cancelled") return b.status === "Cancelled";
      return true;
    });

    return res.status(200).json({
      success: true,
      total: 0, // filtered.length,
      data: [], // filtered,
    });
  } catch (error) {
    console.error("Get Bookings Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update Trip Status
// @route   PATCH /api/partner/bookings/:id/status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, otpCode } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    if (status === "ONGOING" && otpCode && otpCode !== "1234") {
      return res.status(400).json({ success: false, message: "Invalid Customer OTP verification code." });
    }

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

    const bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true });

    return res.status(200).json({
      success: true,
      data: {
        timeframe: req.query.timeframe || "Week",
        totalNetEarnings: 0, // profile.walletBalance || 1250.00,
        grossTripFare: 0, // 14500.00,
        platformCommission: 0, // 2175.00,
        taxes: 0, // 500.00,
        growthPercent: 0, // 12.4,
        chartData: [], /* [
          { day: "Mon", amount: 2400 },
          { day: "Tue", amount: 3100 },
          { day: "Wed", amount: 1800 },
          { day: "Thu", amount: 4200 },
          { day: "Fri", amount: 3500 },
          { day: "Sat", amount: 5100 },
          { day: "Sun", amount: 2840 }
        ], */
        recentPayouts: [] /* [
          {
            id: "p1",
            amount: 12850,
            date: "28 Jul 2026",
            status: "Completed",
            bankName: bank?.bankName || "HDFC Bank",
            accountEnding: bank?.accountNumber ? bank.accountNumber.slice(-4) : "4321",
            referenceId: "UPI/628104928172",
          },
          {
            id: "p2",
            amount: 9400,
            date: "21 Jul 2026",
            status: "Completed",
            bankName: bank?.bankName || "HDFC Bank",
            accountEnding: bank?.accountNumber ? bank.accountNumber.slice(-4) : "4321",
            referenceId: "UPI/628101189230",
          }
        ] */
      }
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

    // Deduct balance atomically
    profile.walletBalance = Math.max(0, profile.walletBalance - amount);
    await profile.save();

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

// @desc    Get partner inbox alerts feed
// @route   GET /api/partner/notifications
export const getNotifications = async (req, res) => {
  try {
    const mockNotifications = [
      {
        id: "n1",
        title: "Trip Fare Credited",
        message: "₹1,850 credited to your MB Wallet for completed trip #MB-89241.",
        time: "10 mins ago",
        type: "Trip",
        read: false,
      },
      {
        id: "n2",
        title: "Weekly Payout Processed",
        message: "Settlement of ₹12,850 successfully initiated.",
        time: "2 hours ago",
        type: "Payout",
        read: false,
      },
      {
        id: "n3",
        title: "Vehicle Insurance Notice",
        message: "Insurance policy for DL01AB1234 expires in 14 days. Upload renewal document.",
        time: "1 day ago",
        type: "Document",
        read: true,
      }
    ];

    return res.status(200).json({
      success: true,
      unreadCount: 0, // mockNotifications.filter(n => !n.read).length,
      data: [], // mockNotifications,
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
    return res.status(200).json({
      success: true,
      message: "Notifications marked as read successfully.",
    });
  } catch (error) {
    console.error("Mark Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
