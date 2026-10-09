import crypto from "crypto";
import { RideBooking } from "../models/RideBooking.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerWalletTransaction from "../models/partner/PartnerWalletTransaction.js";
import { notifyUser } from "../services/notification/notificationService.js";

// Extra-time payment for city round trips (services/cityFare.service.js).
// The trip itself was prepaid; this collects only ride.extraTime.totalAmount,
// computed on the server when the driver completed the trip.

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

const shortId = (id) => `#MB-${String(id).slice(-6).toUpperCase()}`;

// @route   POST /api/ride/:id/extra/pay   (rider)
export const initiateExtraTimePayment = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId });
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const ride = await RideBooking.findOne({ _id: req.params.id, rider: riderProfile._id });
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
    if (ride.extraTime?.status !== "DUE" || !(ride.extraTime.totalAmount > 0)) {
      return res.status(400).json({ success: false, message: "No extra charges are due for this trip" });
    }

    const riderAuth = await RiderAuth.findById(req.riderId);
    const txnid = `MBGX${Date.now()}`;
    const amount = Number(ride.extraTime.totalAmount).toFixed(2);
    const productinfo = "MBGO Extra Time";
    const firstname = riderProfile.fullName || "Rider";
    const email = riderAuth?.email || `${riderProfile.mobileNumber}@mbgo.in`;
    const phone = riderProfile.mobileNumber || "";
    const udf1 = String(ride._id);
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
    const surl = `${backendBaseUrl}/api/ride/extra-payment/success`;
    const furl = `${backendBaseUrl}/api/ride/extra-payment/failure`;
    const hash = generateHash({ txnid, amount, productinfo, firstname, email, udf1 });

    ride.extraTime.paymentInfo = { txnid, status: "Pending" };
    await ride.save();

    return res.json({
      success: true,
      payuUrl: `${payuBaseUrl}/_payment`,
      paymentData: { key: merchantKey, txnid, amount, productinfo, firstname, email, phone, surl, furl, hash, udf1, service_provider: "payu_paisa" },
    });
  } catch (error) {
    console.error("Initiate Extra Time Payment Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/ride/extra-payment/success   (PayU surl)
export const verifyExtraTimePaymentSuccess = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    console.error("⚠️ Extra time payment hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }
  try {
    // Atomic DUE -> PAID so a repeated callback can never credit twice.
    const ride = await RideBooking.findOneAndUpdate(
      { _id: udf1, "extraTime.status": "DUE", "extraTime.totalAmount": Number(amount) },
      { $set: { "extraTime.status": "PAID", "extraTime.paidAt": new Date(), "extraTime.paymentInfo": { txnid, mihpayid, status: "Paid" } } },
      { new: true }
    );
    if (ride) {
      const payout = Number(ride.extraTime.partnerPayout) || 0;
      const partner = ride.assignedPartnerId ? await PartnerProfile.findById(ride.assignedPartnerId) : null;
      if (partner && payout > 0) {
        partner.pendingWalletBalance = (partner.pendingWalletBalance || 0) + payout;
        await partner.save();
        await PartnerWalletTransaction.create({
          partnerId: partner.authId,
          type: "trip_pending_credit",
          amount: payout,
          walletBalanceAfter: partner.walletBalance || 0,
          pendingWalletBalanceAfter: partner.pendingWalletBalance,
          bookingId: ride._id,
          note: `Extra time for trip ${shortId(ride._id)}`,
        });
        await notifyUser({
          recipientType: "Partner",
          recipientId: partner._id,
          title: "Extra time paid",
          message: `₹${payout.toLocaleString("en-IN")} extra time for trip ${shortId(ride._id)} will be added to your wallet within 24 hours.`,
          type: "Trip",
          data: { rideId: ride._id },
          sendPush: false,
        }).catch(() => {});
      }
      const rider = await RiderProfile.findById(ride.rider);
      if (rider) {
        await notifyUser({
          recipientType: "Rider",
          recipientId: rider._id,
          title: "Payment received",
          message: `Extra time charges of ₹${Number(ride.extraTime.totalAmount).toLocaleString("en-IN")} paid. Thank you!`,
          type: "Trip",
          data: { rideId: ride._id },
          pushToken: rider.pushToken,
        }).catch(() => {});
      }
    } else {
      console.error("Extra time payment: no DUE ride for", udf1, amount);
    }
  } catch (error) {
    console.error("Verify Extra Time Payment Error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/success?from=mbgo-ride-extra`);
};

// @route   POST /api/ride/extra-payment/failure   (PayU furl)
export const verifyExtraTimePaymentFailure = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    return res.status(400).send("Invalid transaction");
  }
  try {
    await RideBooking.updateOne(
      { _id: udf1, "extraTime.status": "DUE" },
      { $set: { "extraTime.paymentInfo": { txnid, mihpayid, status: "Failed" } } }
    );
  } catch (error) {
    console.error("Extra Time Payment Failure Error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?from=mbgo-ride-extra`);
};
