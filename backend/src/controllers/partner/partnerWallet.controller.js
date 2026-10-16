import crypto from "crypto";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import PartnerWalletTransaction from "../../models/partner/PartnerWalletTransaction.js";
import PartnerRechargeOrder from "../../models/partner/PartnerRechargeOrder.js";
import DriverCancellation from "../../models/partner/DriverCancellation.js";
import { RideBooking } from "../../models/RideBooking.js";
import RiderProfile from "../../models/rider/RiderProfile.js";
import { notifyUser } from "../../services/notification/notificationService.js";
import { getRideDateTime, getBroadcastExpiry, releaseRideToPartnerPool } from "../ride.controller.js";
import {
  getWalletConfig,
  walletSummary,
  creditWallet,
  debitWallet,
  releaseTripFee,
  computeCancellationCharge,
  rideKm,
  DRIVER_CANCEL_REASONS,
  DRIVER_CANCELLABLE,
  findCancelReason,
} from "../../services/partnerWallet.service.js";
import { CITY_PRICING_MODE } from "../../services/cityFare.service.js";

// MBConnect Partner Wallet: balance, PayU recharge, driver cancellation.

// Same PayU config + hash formulas as controllers/payment.controller.js
// (copied so that shared file stays untouched).
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

const code = (id) => `MB-${String(id).slice(-6).toUpperCase()}`;
const getProfile = (req) => PartnerProfile.findOne({ authId: req.partnerId });

// GET /api/partner/wallet
export const getMyWallet = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const cfg = await getWalletConfig();
    const [transactions, cancellations] = await Promise.all([
      PartnerWalletTransaction.find({ partnerId: profile.authId }).sort({ createdAt: -1 }).limit(100).lean(),
      DriverCancellation.find({ partnerId: profile._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return res.json({ success: true, data: { ...walletSummary(cfg, profile), transactions, cancellations } });
  } catch (error) {
    console.error("Get wallet error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/wallet/recharge  { amount }  -> PayU form data
export const initiateRecharge = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const cfg = await getWalletConfig();
    const amount = Math.round(Number(req.body?.amount) || 0);
    const min = profile.firstRechargeAt ? cfg.minRecharge : cfg.firstRechargeMin;
    if (amount < min) return res.status(400).json({ success: false, message: `Minimum recharge is ₹${min.toLocaleString("en-IN")}.` });
    if (amount > cfg.maxRecharge) return res.status(400).json({ success: false, message: `Maximum recharge is ₹${cfg.maxRecharge.toLocaleString("en-IN")}.` });

    const txnid = `MBCR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const checkoutKey = crypto.randomBytes(16).toString("hex");
    const order = await PartnerRechargeOrder.create({ txnid, partnerId: profile._id, amount, checkoutKey });
    const { payuUrl, paymentData } = await buildPaymentData(order, profile, req);
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;

    return res.json({
      success: true,
      payuUrl,
      paymentData,
      // Open this in the phone browser: it posts the form to PayU.
      checkoutUrl: `${backendBaseUrl}/api/partner-wallet-payment/checkout/${txnid}?k=${checkoutKey}`,
    });
  } catch (error) {
    console.error("Initiate recharge error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PayU form fields for a recharge order (hash computed on the server).
async function buildPaymentData(order, profile, req) {
  const auth = await PartnerAuth.findById(profile.authId).select("email").lean();
  const amountStr = Number(order.amount).toFixed(2);
  const productinfo = "MBConnect Wallet Recharge";
  const firstname = (profile.fullName || "Partner").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 60) || "Partner";
  const email = auth?.email || `${profile._id}@mbconnect.in`;
  const phone = /^\d{10}$/.test(String(profile.mobileNumber || "")) ? profile.mobileNumber : "";
  const udf1 = String(profile._id);
  const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
  const surl = `${backendBaseUrl}/api/partner-wallet-payment/success`;
  const furl = `${backendBaseUrl}/api/partner-wallet-payment/failure`;
  const hash = generateHash({ txnid: order.txnid, amount: amountStr, productinfo, firstname, email, udf1 });
  return {
    payuUrl: `${payuBaseUrl}/_payment`,
    paymentData: { key: merchantKey, txnid: order.txnid, amount: amountStr, productinfo, firstname, email, phone, surl, furl, hash, udf1, service_provider: "payu_paisa" },
  };
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// GET /api/partner-wallet-payment/checkout/:txnid?k=   (public, one-time link)
export const rechargeCheckoutPage = async (req, res) => {
  try {
    const order = await PartnerRechargeOrder.findOne({ txnid: req.params.txnid, checkoutKey: req.query.k, status: "PENDING" });
    if (!order || Date.now() - new Date(order.createdAt).getTime() > 30 * 60 * 1000) {
      return res.status(404).send("This payment link has expired. Please start the recharge again from the MBConnect app.");
    }
    const profile = await PartnerProfile.findById(order.partnerId);
    if (!profile) return res.status(404).send("Not found");
    const { payuUrl, paymentData } = await buildPaymentData(order, profile, req);
    const inputs = Object.entries(paymentData).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}" />`).join("");
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MBConnect Recharge</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:40px 20px;color:#0f172a">
<p style="font-size:18px;font-weight:700">Taking you to secure payment…</p>
<p style="color:#64748b">Recharge of ₹${esc(order.amount)} for your MBConnect wallet</p>
<form id="f" method="POST" action="${esc(payuUrl)}">${inputs}<button type="submit" style="margin-top:16px;padding:12px 20px;border:0;border-radius:10px;background:#FE5300;color:#fff;font-weight:700">Continue to PayU</button></form>
<script>document.getElementById("f").submit();</script></body></html>`);
  } catch (error) {
    console.error("Recharge checkout error:", error.message);
    return res.status(500).send("Something went wrong. Please try again.");
  }
};

// POST /api/partner-wallet-payment/success   (PayU surl, public)
export const rechargeSuccess = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    console.error("⚠️ Wallet recharge hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }
  try {
    if (String(status).toLowerCase() === "success") {
      // PENDING -> PAID once, for the exact amount, so a repeated callback can't credit twice.
      const order = await PartnerRechargeOrder.findOneAndUpdate(
        { txnid, partnerId: udf1, status: "PENDING", amount: Math.round(Number(amount)) },
        { $set: { status: "PAID", mihpayid, paidAt: new Date() } },
        { new: true }
      );
      if (order) {
        const partner = await creditWallet(order.partnerId, order.amount, "recharge", { txnid, note: "Wallet recharge (PayU)" });
        if (partner) {
          notifyUser({
            recipientType: "Partner",
            recipientId: partner._id,
            title: "Wallet recharged",
            message: `₹${order.amount.toLocaleString("en-IN")} added to your MBConnect wallet. Balance: ₹${Number(partner.walletBalance).toLocaleString("en-IN")}.`,
            type: "Payout",
            data: { screen: "PartnerWallet" },
            pushToken: partner.pushToken,
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Recharge success error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/success?from=mbconnect-recharge`);
};

// POST /api/partner-wallet-payment/failure   (PayU furl, public)
export const rechargeFailure = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    return res.status(400).send("Invalid transaction");
  }
  try {
    await PartnerRechargeOrder.updateOne({ txnid, status: "PENDING" }, { $set: { status: "FAILED", mihpayid } });
  } catch (error) {
    console.error("Recharge failure error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?from=mbconnect-recharge`);
};

// ---- Driver cancellation ----

async function previewFor(profile, rideId) {
  const ride = await RideBooking.findOne({ _id: rideId, assignedPartnerId: profile._id }).catch(() => null);
  if (!ride) return { error: "Booking not found.", status: 404 };
  if (!DRIVER_CANCELLABLE.includes(ride.status)) return { error: "This trip can no longer be cancelled.", status: 409 };
  const cfg = await getWalletConfig();
  const applies = !!ride.walletProgram?.applied;
  const { charge, rule } = applies
    ? computeCancellationCharge(cfg, {
        isOutstation: ride.pricingMode !== CITY_PRICING_MODE,
        km: rideKm(ride),
        acceptedAt: ride.walletProgram.acceptedAt,
        pickupAt: getRideDateTime(ride),
      })
    : { charge: 0, rule: "No cancellation charge for this trip" };
  return { ride, cfg, charge, rule };
}

// GET /api/partner/cancel-reasons
export const getDriverCancelReasons = (req, res) =>
  res.json({ success: true, data: DRIVER_CANCEL_REASONS.map(({ key, label, exempt }) => ({ key, label, reviewed: exempt })) });

// GET /api/partner/bookings/:id/cancel-preview
export const previewDriverCancel = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const p = await previewFor(profile, req.params.id);
    if (p.error) return res.status(p.status).json({ success: false, message: p.error });
    return res.json({ success: true, data: { charge: p.charge, rule: p.rule } });
  } catch (error) {
    console.error("Cancel preview error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/bookings/:id/cancel  { reasonKey, comment }
export const driverCancelRide = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const reason = findCancelReason(req.body?.reasonKey);
    if (!reason) return res.status(400).json({ success: false, message: "Please choose a reason." });
    const comment = String(req.body?.comment || "").trim().slice(0, 500);
    if (reason.key === "OTHER" && comment.length < 3) return res.status(400).json({ success: false, message: "Please tell us the reason." });

    const p = await previewFor(profile, req.params.id);
    if (p.error) return res.status(p.status).json({ success: false, message: p.error });
    const statusAtCancel = p.ride.status;

    // Back to the pool -- atomic, so it happens once even on a double tap.
    const ride = await RideBooking.findOneAndUpdate(
      { _id: p.ride._id, assignedPartnerId: profile._id, status: { $in: DRIVER_CANCELLABLE } },
      {
        $set: { status: "AWAITING_ASSIGNMENT", broadcastExpiresAt: getBroadcastExpiry(), needsManualAssignment: false, detailsRevealNotified: false },
        $unset: { assignedPartnerId: 1, assignedVehicleId: 1, assignedDriverId: 1, broadcastPartnerIds: 1 },
        $push: { statusHistory: { status: "AWAITING_ASSIGNMENT", note: `Cancelled by partner ${profile._id}: ${reason.label}${comment ? ` — ${comment}` : ""}` } },
      },
      { new: true }
    );
    if (!ride) return res.status(409).json({ success: false, message: "This trip can no longer be cancelled." });

    await releaseTripFee(ride._id).catch((e) => console.error("Release trip fee error:", e.message));

    // Exempt-type reasons are never charged automatically -- admin reviews them.
    const status = p.charge > 0 ? (reason.exempt ? "REVIEW" : "CHARGED") : "FREE";
    const record = await DriverCancellation.create({
      rideId: ride._id,
      rideCode: code(ride._id),
      partnerId: profile._id,
      reasonKey: reason.key,
      reasonLabel: reason.label,
      comment,
      rule: p.rule,
      charge: p.charge,
      chargedAmount: status === "CHARGED" ? p.charge : 0,
      status,
      rideStatusAtCancel: statusAtCancel,
      decidedBy: "SYSTEM",
      decidedAt: new Date(),
    });
    if (status === "CHARGED") {
      await debitWallet(profile._id, p.charge, "cancel_charge", { rideId: ride._id, note: `Cancelled ${code(ride._id)}: ${p.rule}` });
    }

    // Rider: a new partner is being found; other drivers: the ride is available again.
    const rider = await RiderProfile.findById(ride.rider);
    if (rider) {
      notifyUser({
        recipientType: "Rider",
        recipientId: rider._id,
        title: "Assigning a new partner",
        message: "Your ride partner had to cancel. We're assigning a new partner and will notify you once confirmed.",
        type: "Trip",
        data: { rideId: ride._id },
        pushToken: rider.pushToken,
      }).catch(() => {});
    }
    releaseRideToPartnerPool(ride).catch((e) => console.error("Re-broadcast error:", e.message));

    return res.json({
      success: true,
      message:
        status === "CHARGED"
          ? `Trip cancelled. ₹${p.charge} cancellation charge was taken from your wallet.`
          : status === "REVIEW"
            ? "Trip cancelled. Our team will review the reason; no charge has been taken."
            : "Trip cancelled. No cancellation charge.",
      data: { status, charge: record.chargedAmount },
    });
  } catch (error) {
    console.error("Driver cancel error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
