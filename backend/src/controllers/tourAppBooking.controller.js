import crypto from "crypto";
import { TourAppBooking } from "../models/TourAppBooking.js";
import { Package } from "../models/Package.js";
// Registers the Batch model so Package.populate("batch") works regardless of import order.
import "../models/Batch.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";
import { notifyUser } from "../services/notification/notificationService.js";
import { normalizeTravellers, computeTourBookingPrice, resolveAddOns } from "../services/tourAppPricing.service.js";

// Holiday-package booking + PayU payment for the MBGo rider app.
// Self-contained: the website's /booking and /payment flows (website user
// accounts) are not touched or reused at runtime.

// Same PayU config + hash formulas as controllers/payment.controller.js
// (copied rather than imported so that shared file stays untouched).
const merchantKey = process.env.PAYU_KEY;
const merchantSalt = process.env.PAYU_SALT;
const payuBaseUrl = process.env.PAYU_ENV === "prod" ? "https://secure.payu.in" : "https://test.payu.in";

function generateHash({
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
}) {
  const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${merchantSalt}`;

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

function verifyHash({
  status,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
}) {
  const hashString = `${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

async function getRiderProfile(req) {
  return RiderProfile.findOne({ authId: req.riderId });
}

// @route   POST /api/tour-booking
// @body    { packageId, batchId, travellers: { quad, triple, double, child },
//           addOns?: [{ itemId, noOfPeople }], paymentOption: "FULL" | "ADVANCE" }
// @desc    Create an unpaid booking with server-computed prices.
export const createTourAppBooking = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });

    const { packageId, batchId, travellers: rawTravellers, addOns: rawAddOns = [], paymentOption = "FULL" } = req.body || {};
    if (!packageId || !batchId) {
      return res.status(400).json({ success: false, message: "Package and departure date are required" });
    }

    const { travellers, error: travellerError } = normalizeTravellers(rawTravellers);
    if (travellerError) return res.status(400).json({ success: false, message: travellerError });

    const pkg = await Package.findOne({ _id: packageId, status: "published" })
      .populate("batch")
      .populate("destination", "name")
      .lean();
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    const batch = (pkg.batch || []).find((b) => String(b._id) === String(batchId));
    if (!batch) return res.status(400).json({ success: false, message: "Selected departure is not available" });
    if (new Date(batch.startDate).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "This departure has already started. Please pick another date." });
    }

    const { addOns, error: addOnError } = resolveAddOns(pkg.addOns, rawAddOns);
    if (addOnError) return res.status(400).json({ success: false, message: addOnError });

    const price = computeTourBookingPrice({ batch, travellers, addOns, paymentOption });
    if (price.error) return res.status(400).json({ success: false, message: price.error });

    const image = [...(pkg.coverImages || []), pkg.coverImage, ...(pkg.gallery || [])].map((i) => i?.url).find(Boolean);

    const booking = await TourAppBooking.create({
      rider: riderProfile._id,
      package: pkg._id,
      batchId: batch._id,
      packageTitle: pkg.title,
      packageImage: image,
      destinationName: pkg.destination?.name?.trim(),
      durationDays: pkg.duration?.days,
      durationNights: pkg.duration?.nights,
      startDate: batch.startDate,
      endDate: batch.endDate,
      travellers,
      priceLines: price.lines,
      addOns,
      addOnsAmount: price.addOnsAmount,
      baseAmount: price.baseAmount,
      gstAmount: price.gstAmount,
      totalAmount: price.totalAmount,
      paymentOption,
      payNowAmount: price.payNowAmount,
      balanceAmount: price.balanceAmount,
      balanceDueDate: price.balanceDueDate,
    });

    return res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error("Create Tour App Booking Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/tour-booking/my
export const getMyTourAppBookings = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const bookings = await TourAppBooking.find({ rider: riderProfile._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error("Get My Tour App Bookings Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/tour-booking/:id
export const getTourAppBookingById = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const booking = await TourAppBooking.findOne({ _id: req.params.id, rider: riderProfile._id }).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error("Get Tour App Booking Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/tour-booking/:id/pay
// @desc    PayU checkout data for an unpaid booking (amount from the stored booking).
export const initiateTourAppPayment = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });

    const booking = await TourAppBooking.findOne({ _id: req.params.id, rider: riderProfile._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.bookingStatus !== "PaymentPending") {
      return res.status(400).json({ success: false, message: "This booking is not awaiting payment" });
    }

    const riderAuth = await RiderAuth.findById(req.riderId);
    const txnid = `MBGT${Date.now()}`;
    const amount = Number(booking.payNowAmount).toFixed(2);
    const productinfo = "MBGO Holiday Package";
    const firstname = riderProfile.fullName || "Rider";
    const email = riderAuth?.email || `${riderProfile.mobileNumber}@mbgo.in`;
    const phone = riderProfile.mobileNumber || "";
    const udf1 = String(booking._id);
    // From the incoming request (like the ride payment) so local PayU test
    // mode works against a local backend.
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
    const surl = `${backendBaseUrl}/api/tour-booking/payment/success`;
    const furl = `${backendBaseUrl}/api/tour-booking/payment/failure`;
    const hash = generateHash({ txnid, amount, productinfo, firstname, email, udf1 });

    booking.paymentInfo = { ...(booking.paymentInfo?.toObject?.() || {}), txnid, status: "Pending" };
    await booking.save();

    return res.json({
      success: true,
      payuUrl: `${payuBaseUrl}/_payment`,
      paymentData: { key: merchantKey, txnid, amount, productinfo, firstname, email, phone, surl, furl, hash, udf1, service_provider: "payu_paisa" },
    });
  } catch (error) {
    console.error("Initiate Tour App Payment Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/tour-booking/payment/success   (PayU surl)
export const verifyTourAppPaymentSuccess = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    console.error("⚠️ Tour app payment hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  try {
    const booking = await TourAppBooking.findById(udf1);
    // Only confirm when PayU's amount matches what this booking asked for.
    if (booking && Number(amount).toFixed(2) === Number(booking.payNowAmount).toFixed(2)) {
      booking.paymentInfo = { txnid, mihpayid, status: "Paid", paidAt: new Date() };
      booking.bookingStatus = "Confirmed";
      await booking.save();

      try {
        const riderProfile = await RiderProfile.findById(booking.rider);
        if (riderProfile) {
          await notifyUser({
            recipientType: "Rider",
            recipientId: riderProfile._id,
            title: "Holiday booked!",
            message: `Your ${booking.packageTitle} booking is confirmed.`,
            type: "Trip",
            data: { tourBookingId: booking._id },
            pushToken: riderProfile.pushToken,
          });
        }
      } catch (error) {
        console.error("Tour Booking Confirmed Notification Error:", error.message);
      }
    } else {
      console.error("Tour app payment amount/booking mismatch:", udf1, amount);
    }
  } catch (error) {
    console.error("Verify Tour App Payment Error:", error.message);
  }

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success?from=mbgo-tour`);
};

// @route   POST /api/tour-booking/payment/failure   (PayU furl)
export const verifyTourAppPaymentFailure = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    console.error("⚠️ Tour app payment (failure) hash mismatch");
    return res.status(400).send("Invalid transaction");
  }
  try {
    // Booking stays PaymentPending so the rider can retry.
    await TourAppBooking.updateOne(
      { _id: udf1, bookingStatus: "PaymentPending" },
      { $set: { "paymentInfo.status": "Failed", "paymentInfo.txnid": txnid, "paymentInfo.mihpayid": mihpayid } }
    );
  } catch (error) {
    console.error("Tour App Payment Failure Update Error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?from=mbgo-tour`);
};

// @route   GET /api/admin/tour-app-bookings   (admin)
export const adminListTourAppBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { bookingStatus: status } : {};
    const bookings = await TourAppBooking.find(filter)
      .populate("rider", "fullName mobileNumber")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, total: bookings.length, data: bookings });
  } catch (error) {
    console.error("Admin List Tour App Bookings Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
