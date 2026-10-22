import cron from "node-cron";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderWalletTransaction from "../models/rider/RiderWalletTransaction.js";
import { RideBooking } from "../models/RideBooking.js";
import { RiderReferralConfig, RIDER_REFERRAL_CONFIG_KEY } from "../models/rider/RiderReferralConfig.js";
import { notifyUser } from "./notification/notificationService.js";

// MBGO rider wallet (RiderProfile.walletBalance): filled by referral rewards,
// spendable on ride bills, never withdrawable.
//
// Using it on a ride: at payment start the wallet amount is moved off the
// balance and held on the ride (walletRedemption RESERVED); PayU is charged
// totalAmount - held. totalAmount / commission / partnerPayout never change.
//   payment success  -> USED
//   payment failure / abandoned (still PAYMENT_PENDING after HOLD_MINUTES) -> RELEASED (money back)
//   ride CANCELLED (any path) -> REFUNDED (money back)
// Every move is an atomic update guarded on the current state, so a retry
// can never pay out twice, and every move is written to RiderWalletTransaction.

export const HOLD_MINUTES = 45;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export async function riderLedger(profile, type, amount, extra = {}) {
  return RiderWalletTransaction.create({
    riderId: profile._id,
    type,
    amount: money(Math.abs(amount)),
    walletBalanceAfter: money(profile.walletBalance),
    referralId: extra.referralId,
    rideId: extra.rideId,
    note: extra.note,
    adminId: extra.adminId,
    adminName: extra.adminName,
  });
}

// Best effort: a notification problem never affects the money flow.
export async function tellRider(riderProfileId, title, message, data = {}) {
  try {
    const p = await RiderProfile.findById(riderProfileId).select("_id pushToken").lean();
    if (!p) return;
    await notifyUser({ recipientType: "Rider", recipientId: p._id, title, message, type: "Payment", data, pushToken: p.pushToken });
  } catch (e) {
    console.error("Rider wallet notification error:", e.message);
  }
}

/** ₹ of wallet usable on one ride (0 = no cap), from the MBGO referral settings. */
export async function getMaxWalletPerRide() {
  const c = await RiderReferralConfig.findOne({ key: RIDER_REFERRAL_CONFIG_KEY }).select("maxWalletPerRide").lean();
  return Math.max(0, Number(c?.maxWalletPerRide) || 0);
}

/** How much wallet this ride could use right now (PayU needs at least ₹1 left to charge). */
export function walletUsableFor({ balance, totalAmount, cap }) {
  let amt = Math.min(money(balance), money(totalAmount) - 1);
  if (cap > 0) amt = Math.min(amt, cap);
  amt = Math.floor(amt * 100) / 100;
  return amt >= 1 ? amt : 0;
}

/** Gives a RESERVED hold back to the wallet (payment failed / abandoned / switched off). */
export async function releaseRideWallet(rideId, note = "Payment not completed — wallet amount returned") {
  const ride = await RideBooking.findOneAndUpdate(
    { _id: rideId, "walletRedemption.status": "RESERVED" },
    { $set: { "walletRedemption.status": "RELEASED", "walletRedemption.releasedAt": new Date() } },
    { new: true }
  );
  if (!ride) return 0;
  const amt = money(ride.walletRedemption.amount);
  const p = await RiderProfile.findByIdAndUpdate(ride.rider, { $inc: { walletBalance: amt } }, { new: true });
  if (p) await riderLedger(p, "ride_wallet_refund", amt, { rideId: ride._id, note });
  return amt;
}

/**
 * Called when the rider starts paying for a ride. Holds (or releases) wallet
 * money on the ride and returns the ₹ held. useWallet=false keeps the old
 * behaviour exactly (returns 0, nothing touched unless an earlier hold exists).
 */
export async function prepareRideWallet(ride, riderProfile, useWallet) {
  const held = ride.walletRedemption?.status === "RESERVED" ? money(ride.walletRedemption.amount) : 0;
  if (!useWallet) {
    if (held > 0) await releaseRideWallet(ride._id, "Wallet not used for this payment — amount returned");
    return 0;
  }
  if (held > 0) return held; // retry of the same payment: keep the existing hold

  const cap = await getMaxWalletPerRide();
  const fresh = await RiderProfile.findById(riderProfile._id).select("walletBalance").lean();
  const want = walletUsableFor({ balance: fresh?.walletBalance, totalAmount: ride.totalAmount, cap });
  if (want <= 0) return 0;

  // 1) Claim the ride (only if no live hold), 2) take the money (only if still there).
  const claimed = await RideBooking.findOneAndUpdate(
    { _id: ride._id, status: "PAYMENT_PENDING", "walletRedemption.status": { $nin: ["RESERVED", "USED", "REFUNDED"] } },
    { $set: { walletRedemption: { amount: want, status: "RESERVED", reservedAt: new Date() } } },
    { new: true }
  );
  if (!claimed) {
    const again = await RideBooking.findById(ride._id).select("walletRedemption").lean();
    return again?.walletRedemption?.status === "RESERVED" ? money(again.walletRedemption.amount) : 0;
  }
  const p = await RiderProfile.findOneAndUpdate(
    { _id: riderProfile._id, walletBalance: { $gte: want } },
    { $inc: { walletBalance: -want } },
    { new: true }
  );
  if (!p) {
    // Balance changed meanwhile: undo the claim, pay without wallet.
    await RideBooking.updateOne(
      { _id: ride._id, "walletRedemption.status": "RESERVED" },
      { $set: { "walletRedemption.status": "RELEASED", "walletRedemption.releasedAt": new Date() } }
    );
    return 0;
  }
  await riderLedger(p, "ride_wallet_payment", want, { rideId: ride._id, note: "Used on ride payment" });
  return want;
}

/**
 * After PayU confirms the ride payment. RESERVED -> USED. If the hold had
 * already been released (payment finished very late) but PayU was charged the
 * reduced amount, take the wallet amount again so the books stay right.
 */
export async function onRidePaymentSuccess(rideId, paidAmount) {
  const used = await RideBooking.findOneAndUpdate(
    { _id: rideId, "walletRedemption.status": "RESERVED" },
    { $set: { "walletRedemption.status": "USED", "walletRedemption.usedAt": new Date() } },
    { new: true }
  );
  if (used) return;
  const r = await RideBooking.findById(rideId).select("rider totalAmount walletRedemption").lean();
  if (r?.walletRedemption?.status !== "RELEASED") return;
  const amt = money(r.walletRedemption.amount);
  if (!(Number(paidAmount) > 0) || money(paidAmount) > money(r.totalAmount - amt) + 0.5) return; // paid in full: nothing to take
  const late = await RideBooking.findOneAndUpdate(
    { _id: rideId, "walletRedemption.status": "RELEASED" },
    { $set: { "walletRedemption.status": "USED", "walletRedemption.usedAt": new Date() } },
    { new: true }
  );
  if (!late) return;
  const p = await RiderProfile.findByIdAndUpdate(r.rider, { $inc: { walletBalance: -amt } }, { new: true });
  if (p) await riderLedger(p, "ride_wallet_payment", amt, { rideId, note: "Used on ride payment (payment completed late)" });
}

/** A cancelled ride gives its wallet part back (whatever path cancelled it). */
export async function refundCancelledRideWallet(rideId) {
  const ride = await RideBooking.findOneAndUpdate(
    { _id: rideId, status: "CANCELLED", "walletRedemption.status": { $in: ["RESERVED", "USED"] } },
    { $set: { "walletRedemption.status": "REFUNDED", "walletRedemption.refundedAt": new Date() } },
    { new: true }
  );
  if (!ride) return 0;
  const amt = money(ride.walletRedemption.amount);
  const p = await RiderProfile.findByIdAndUpdate(ride.rider, { $inc: { walletBalance: amt } }, { new: true });
  if (p) {
    await riderLedger(p, "ride_wallet_refund", amt, { rideId: ride._id, note: "Ride cancelled — wallet amount returned" });
    tellRider(p._id, "Wallet amount returned", `${inr(amt)} used from your MB Wallet on a cancelled ride is back in your wallet.`, { screen: "wallet", walletRideId: String(ride._id) });
  }
  return amt;
}

/** Background: release abandoned holds, refund cancelled rides. */
export async function runRiderWalletSweep() {
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60e3);
  const [abandoned, cancelled] = await Promise.all([
    RideBooking.find({ status: "PAYMENT_PENDING", "walletRedemption.status": "RESERVED", "walletRedemption.reservedAt": { $lte: cutoff } }).select("_id").limit(200).lean(),
    RideBooking.find({ status: "CANCELLED", "walletRedemption.status": { $in: ["RESERVED", "USED"] } }).select("_id").limit(200).lean(),
  ]);
  let released = 0;
  let refunded = 0;
  for (const r of abandoned) {
    try {
      if (await releaseRideWallet(r._id)) released++;
    } catch (e) {
      console.error("Wallet release failed:", String(r._id), e.message);
    }
  }
  for (const r of cancelled) {
    try {
      if (await refundCancelledRideWallet(r._id)) refunded++;
    } catch (e) {
      console.error("Wallet refund failed:", String(r._id), e.message);
    }
  }
  return { released, refunded };
}
