import crypto from "crypto";
import { Booking } from "../models/Booking.js";
import { MembershipBooking } from "../models/membershipBooking.js";
import { CustomizedBookings } from "../models/CustomizedBookings.js";
import { CustomizedTourBooking } from "../models/CustomizedTourBooking.js";
import { VehicleBooking } from "../models/VehicleBooking.js";
import { VisaApplication } from "../models/VisaApplication.js";
import { RideBooking } from "../models/RideBooking.js";
import { releaseRideToPartnerPool } from "./ride.controller.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";

// ENV CONFIG
const merchantKey = process.env.PAYU_KEY;
const merchantSalt = process.env.PAYU_SALT;
const payuBaseUrl =
  process.env.PAYU_ENV === "prod"
    ? "https://secure.payu.in"
    : "https://test.payu.in";

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
// API to initiate payment
export const createPayemnt = (req, res) => {
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    udf1,
    surl,
    furl,
  } = req.body;

  if (
    !txnid ||
    !amount ||
    !productinfo ||
    !firstname ||
    !email ||
    !udf1 ||
    !surl ||
    !furl
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hash = generateHash({
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  const paymentData = {
    key: merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl, // Success page
    furl, // Failure page
    hash,
    udf1,
    service_provider: "payu_paisa",
  };

  res.json({ payuUrl: `${payuBaseUrl}/_payment`, paymentData });
};

// API to initiate a PayU payment for a ride booking. Separate from the
// generic createPayemnt above because riders authenticate through an
// isolated JWT system (isRiderAuthenticated), not the generic
// isAuthenticated/authorizedRoles(["user", ...]) used by every other
// booking type — a rider token can never pass that check, so this route
// is gated by isRiderAuthenticated instead (see ride.routes.js).
// Amount/txnid/product info are computed server-side from the stored ride,
// rather than trusted from the client, since this is a payment initiation.
export const createRidePayment = async (req, res) => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      return res.status(400).json({ success: false, message: "rideId is required" });
    }

    const riderProfile = await RiderProfile.findOne({ authId: req.riderId });
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    const ride = await RideBooking.findOne({ _id: rideId, rider: riderProfile._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    if (ride.status !== "PAYMENT_PENDING") {
      return res.status(400).json({ success: false, message: "This ride is not awaiting payment" });
    }

    const riderAuth = await RiderAuth.findById(req.riderId);

    const txnid = `MBGO${Date.now()}`;
    const amount = ride.totalAmount;
    const productinfo = "MBGO Ride Booking";
    const firstname = riderProfile.fullName || "Rider";
    const email = riderAuth?.email || "";
    const phone = riderProfile.mobileNumber || "";
    const udf1 = String(ride._id);
    // Derived from the incoming request rather than the BACKEND_URL env var
    // (which is pinned to production) so this keeps working when the backend
    // is hit from a local dev server during PayU testmode testing.
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
    const surl = `${backendBaseUrl}/api/payment/success-ride`;
    const furl = `${backendBaseUrl}/api/payment/failure-ride`;

    const hash = generateHash({ txnid, amount, productinfo, firstname, email, udf1 });

    const paymentData = {
      key: merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
      udf1,
      service_provider: "payu_paisa",
    };

    return res.json({ success: true, payuUrl: `${payuBaseUrl}/_payment`, paymentData });
  } catch (error) {
    console.error("Create Ride Payment Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

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
export const verifySuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const booking = await Booking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Paid",
      },
      bookingStatus: "Confirmed",
    },
    { new: true },
  ).exec();
  console.log("Package Payment Verified:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const booking = await Booking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Failed",
      },
    },
    { new: true },
  ).exec();
  console.log("Payment Failed:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};

export const verifyMembershipSuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const booking = await MembershipBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Paid",
      },
      membershipStatus: "Active",
    },
    { new: true },
  ).exec();
  console.log("Payment Verified:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyMembershipFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const booking = await MembershipBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Failed",
      },
      membershipStatus: "Cancelled",
    },
    { new: true },
  ).exec();
  console.log("Payment Failed:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};

export const verifyCustomizedSuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;
  // console.log("Success Data is:", data);
  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const myBooking = await CustomizedBookings.findById({ _id: udf1 }).exec();
  // console.log("Mybooking Data is:", myBooking);
  if (myBooking.finalPrice === myBooking.paidPrice) {
    const booking = await CustomizedBookings.findOneAndUpdate(
      { _id: udf1 },
      {
        paymentInfo: {
          orderId: txnid,
          paymentId: mihpayid,
          signature: hash,
          status: "Paid",
        },
        bookingStatus: "Confirmed",
      },
      { new: true },
    ).exec();
    // console.log("Mybooking Data is finalpaymnet:", booking);
  } else {
    const booking = await CustomizedBookings.findOneAndUpdate(
      { _id: udf1 },
      {
        paymentInfo: {
          orderId: txnid,
          paymentId: mihpayid,
          signature: hash,
          status: "Partial",
        },
        bookingStatus: "Confirmed",
      },
      { new: true },
    ).exec();

    // console.log("Mybooking Data is partialpaymnet:", booking);
  }
  // console.log("Payment Verified:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyCustomizedFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const booking = await CustomizedBookings.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Failed",
      },
    },
    { new: true },
  ).exec();
  console.log("Payment Failed:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};

export const verifyCustomizedTourSuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here

  const booking = await CustomizedTourBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Paid",
      },
      bookingStatus: "Confirmed",
    },
    { new: true },
  ).exec();
  console.log("Mybooking Data is finalpayment:", booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyCustomizedTourFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here

  const booking = await CustomizedTourBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Failed",
      },
      bookingStatus: "Cancelled",
    },
    { new: true },
  ).exec();
  console.log("Mybooking Data is finalpayment:", booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};

export const verifyVehicleSuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here

  const booking = await VehicleBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Paid",
      },
      bookingStatus: "Confirmed",
    },
    { new: true },
  ).exec();
  console.log("Mybooking Data is finalpayment:", booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyVehicleFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here

  const booking = await VehicleBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Failed",
      },
      bookingStatus: "Cancelled",
    },
    { new: true },
  ).exec();
  console.log("Mybooking Data is finalpayment:", booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};

export const verifyVisaSuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const application = await VisaApplication.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Paid",
      },
      applicationStatus: "Submitted",
    },
    { new: true },
  ).exec();
  console.log("Visa Payment Verified:", data, application);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyVisaFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  // ✅ Update DB with payment status here
  const application = await VisaApplication.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: {
        orderId: txnid,
        paymentId: mihpayid,
        signature: hash,
        status: "Failed",
      },
      applicationStatus: "Pending",
    },
    { new: true },
  ).exec();
  console.log("Visa Payment Failed:", data, application);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};

export const verifyRideSuccessPayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  const ride = await RideBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: { txnid, mihpayid, hash, status: "Paid" },
      status: "AWAITING_ASSIGNMENT",
      $push: {
        statusHistory: [{ status: "PAID" }, { status: "AWAITING_ASSIGNMENT" }],
      },
    },
    { new: true },
  ).exec();

  if (ride) {
    try {
      await releaseRideToPartnerPool(ride);
    } catch (error) {
      console.error("Release Ride To Partner Pool Error:", error.message);
    }
  }
  console.log("Ride Payment Verified:", data, ride);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
};

export const verifyRideFailurePayment = async (req, res) => {
  const data = req.body;
  const {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    udf1,
    mihpayid,
  } = data;

  const expectedHash = verifyHash({
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  if (expectedHash !== hash) {
    console.error("⚠️ Hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }

  const ride = await RideBooking.findOneAndUpdate(
    { _id: udf1 },
    {
      paymentInfo: { txnid, mihpayid, hash, status: "Failed" },
      status: "CANCELLED",
      cancelReason: "Payment failed",
      $push: { statusHistory: { status: "CANCELLED", note: "Payment failed" } },
    },
    { new: true },
  ).exec();
  console.log("Ride Payment Failed:", data, ride);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};
