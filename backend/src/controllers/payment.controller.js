import crypto from "crypto";
import { Booking } from "../models/Booking.js";
import { MembershipBooking } from "../models/membershipBooking.js";
import { CustomizedBookings } from "../models/CustomizedBookings.js";

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
    { new: true }
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
    { new: true }
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
    { new: true }
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
    { new: true }
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
      { new: true }
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
      { new: true }
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
    { new: true }
  ).exec();
  console.log("Payment Failed:", data, booking);

  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
};
