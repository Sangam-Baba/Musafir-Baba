import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerWalletTransaction from "../models/partner/PartnerWalletTransaction.js";
import { PartnerWalletConfig, PARTNER_WALLET_CONFIG_KEY } from "../models/partner/PartnerWalletConfig.js";
import { RideBooking } from "../models/RideBooking.js";

// MBConnect "Partner Wallet" program.
// Uses the driver's one wallet (PartnerProfile.walletBalance — the same balance
// trip earnings are released into). Recharges add to it. While the program is ON:
//   - accepting needs (balance − held − trip fee) >= minimum balance
//   - the trip fee (₹/km × booked km) is HELD at acceptance and CHARGED at completion
//   - trip earnings carry no commission (the per-km fee replaces it)
//   - driver cancellations are charged per the slabs below
// While OFF (default) none of this runs and everything behaves as before.

export const DEFAULT_WALLET_CONFIG = {
  key: PARTNER_WALLET_CONFIG_KEY,
  enabled: false,
  firstRechargeMin: 1000,
  minRecharge: 100,
  maxRecharge: 50000,
  minBalance: 300,
  feePerKm: 1,
  cancellation: {
    freeMinutes: 5,
    regularWithin24h: 50,
    regularAfter24h: 100,
    outstationFreeDays: 7,
    outstationMidPerKm: 0.5,
    outstationLatePerKm: 1.5,
  },
};

export const DRIVER_CANCEL_REASONS = [
  { key: "VEHICLE_ISSUE", label: "Vehicle breakdown / issue", exempt: false },
  { key: "NOT_AVAILABLE", label: "I'm no longer available", exempt: false },
  { key: "TOO_FAR", label: "Pickup is too far", exempt: false },
  { key: "RIDER_ASKED", label: "Rider asked me to cancel", exempt: true },
  { key: "EMERGENCY", label: "Personal or medical emergency", exempt: true },
  { key: "WRONG_DETAILS", label: "Wrong booking details", exempt: true },
  { key: "APP_ISSUE", label: "App or platform problem", exempt: true },
  { key: "OTHER", label: "Other reason", exempt: false },
];
export const findCancelReason = (key) => DRIVER_CANCEL_REASONS.find((r) => r.key === key) || null;
// Assigned but not yet started.
export const DRIVER_CANCELLABLE = ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED"];

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Config merged over defaults (works even if no document exists yet).
export function normalizeConfig(doc) {
  const c = doc || {};
  const d = DEFAULT_WALLET_CONFIG;
  const cc = c.cancellation || {};
  return {
    enabled: !!c.enabled,
    firstRechargeMin: num(c.firstRechargeMin, d.firstRechargeMin),
    minRecharge: num(c.minRecharge, d.minRecharge),
    maxRecharge: num(c.maxRecharge, d.maxRecharge),
    minBalance: num(c.minBalance, d.minBalance),
    feePerKm: num(c.feePerKm, d.feePerKm),
    cancellation: Object.fromEntries(Object.entries(d.cancellation).map(([k, v]) => [k, num(cc[k], v)])),
  };
}

export async function getWalletConfig() {
  return normalizeConfig(await PartnerWalletConfig.findOne({ key: PARTNER_WALLET_CONFIG_KEY }).lean());
}

// ---- Pure rules (tested in tests/partnerWallet.service.test.js) ----

// Booked trip km: route distance, both ways for round trips.
export function rideKm(ride) {
  const km = Number(ride?.distanceKm) || 0;
  return Math.round(km * (ride?.tripType === "ROUND_TRIP" ? 2 : 1) * 10) / 10;
}

export function computeTripFee(cfg, ride) {
  return money(cfg.feePerKm * rideKm(ride));
}

// What's available to hold for a new trip.
export function availableBalance(profile) {
  return money((Number(profile?.walletBalance) || 0) - (Number(profile?.walletReserved) || 0));
}

// Why a driver can't accept a ride right now ("" = they can).
export function acceptBlockReason(cfg, profile, fee) {
  const after = availableBalance(profile) - fee;
  if (after < cfg.minBalance) {
    const need = money(cfg.minBalance + fee - availableBalance(profile));
    return `Low wallet balance. Recharge at least ₹${Math.ceil(need).toLocaleString("en-IN")} to accept this ride (₹${cfg.minBalance} must stay in your wallet after the ₹${fee} trip fee).`;
  }
  return "";
}

// Driver cancellation charge. City rides use the "regular" flat slabs;
// outstation rides use the per-km slabs by time before pickup (never both).
export function computeCancellationCharge(cfg, { isOutstation, km, acceptedAt, pickupAt, now = new Date() }) {
  const c = cfg.cancellation;
  const minutesSinceAccept = acceptedAt ? (now - new Date(acceptedAt)) / 60000 : Infinity;
  if (minutesSinceAccept <= c.freeMinutes) return { charge: 0, rule: `Within ${c.freeMinutes} minutes of accepting` };
  if (isOutstation) {
    const hoursToPickup = pickupAt ? (new Date(pickupAt) - now) / 3600000 : 0;
    if (hoursToPickup > c.outstationFreeDays * 24) return { charge: 0, rule: `More than ${c.outstationFreeDays} days before pickup` };
    if (hoursToPickup >= 24) return { charge: money(c.outstationMidPerKm * km), rule: `24 hours to ${c.outstationFreeDays} days before pickup (₹${c.outstationMidPerKm}/km)` };
    return { charge: money(c.outstationLatePerKm * km), rule: `Within 24 hours of pickup (₹${c.outstationLatePerKm}/km)` };
  }
  if (minutesSinceAccept <= 24 * 60) return { charge: money(c.regularWithin24h), rule: "Within 24 hours of accepting" };
  return { charge: money(c.regularAfter24h), rule: "More than 24 hours after accepting" };
}

// ---- Money operations (atomic, each safe to call twice) ----

// Same ledger as trip earnings (partnerId there is the PartnerAuth id).
// amount is positive; the type says which way the money moved.
export async function ledger(partner, type, amount, { rideId, ...extra } = {}) {
  return PartnerWalletTransaction.create({
    partnerId: partner.authId,
    type,
    amount: money(Math.abs(amount)),
    walletBalanceAfter: money(partner.walletBalance),
    pendingWalletBalanceAfter: money(partner.pendingWalletBalance),
    bookingId: rideId,
    ...extra,
  });
}

// Hold `fee` only if the driver keeps at least minBalance available afterwards.
export async function reserveTripFee(partnerProfileId, fee, cfg) {
  return PartnerProfile.findOneAndUpdate(
    {
      _id: partnerProfileId,
      $expr: {
        $gte: [
          { $subtract: [{ $subtract: [{ $ifNull: ["$walletBalance", 0] }, { $ifNull: ["$walletReserved", 0] }] }, fee] },
          cfg.minBalance,
        ],
      },
    },
    { $inc: { walletReserved: fee } },
    { new: true }
  );
}

export async function unreserve(partnerProfileId, fee) {
  if (!(fee > 0)) return;
  await PartnerProfile.updateOne({ _id: partnerProfileId }, { $inc: { walletReserved: -fee } });
}

// Ride completed: take the held fee from the balance (once).
export async function chargeTripFee(rideId) {
  const ride = await RideBooking.findOneAndUpdate(
    { _id: rideId, "walletProgram.applied": true, "walletProgram.status": "RESERVED" },
    { $set: { "walletProgram.status": "CHARGED", "walletProgram.settledAt": new Date() } },
    { new: true }
  );
  if (!ride) return null;
  const { fee, partnerId, km, feePerKm } = ride.walletProgram;
  const partner = await PartnerProfile.findByIdAndUpdate(partnerId, { $inc: { walletBalance: -fee, walletReserved: -fee } }, { new: true });
  if (partner) {
    await ledger(partner, "platform_fee", fee, { rideId: ride._id, note: `Platform fee ₹${feePerKm}/km × ${km} km` });
  }
  return { fee, partner };
}

// Ride cancelled / reassigned: give the held fee back (once).
export async function releaseTripFee(rideId) {
  const ride = await RideBooking.findOneAndUpdate(
    { _id: rideId, "walletProgram.applied": true, "walletProgram.status": "RESERVED" },
    { $set: { "walletProgram.status": "RELEASED", "walletProgram.settledAt": new Date() } },
    { new: true }
  );
  if (!ride) return null;
  await unreserve(ride.walletProgram.partnerId, ride.walletProgram.fee);
  return ride.walletProgram.fee;
}

// Recharge paid / cancellation charge refunded. type: recharge | cancel_charge_refund
export async function creditWallet(partnerProfileId, amount, type, extra = {}) {
  const partner = await PartnerProfile.findByIdAndUpdate(partnerProfileId, { $inc: { walletBalance: amount } }, { new: true });
  if (!partner) return null;
  if (type === "recharge" && !partner.firstRechargeAt) {
    await PartnerProfile.updateOne({ _id: partner._id, firstRechargeAt: null }, { $set: { firstRechargeAt: new Date() } });
  }
  await ledger(partner, type, amount, extra);
  return partner;
}

// Cancellation charge (balance may go below zero; the driver must recharge). type: cancel_charge
export async function debitWallet(partnerProfileId, amount, type, extra = {}) {
  const partner = await PartnerProfile.findByIdAndUpdate(partnerProfileId, { $inc: { walletBalance: -amount } }, { new: true });
  if (!partner) return null;
  await ledger(partner, type, amount, extra);
  return partner;
}

// Summary the app shows.
export function walletSummary(cfg, profile) {
  return {
    enabled: cfg.enabled,
    balance: money(profile?.walletBalance),
    reserved: money(profile?.walletReserved),
    available: availableBalance(profile),
    pending: money(profile?.pendingWalletBalance),
    firstRechargeDone: !!profile?.firstRechargeAt,
    rules: {
      firstRechargeMin: cfg.firstRechargeMin,
      minRecharge: cfg.minRecharge,
      maxRecharge: cfg.maxRecharge,
      minBalance: cfg.minBalance,
      feePerKm: cfg.feePerKm,
      cancellation: cfg.cancellation,
    },
  };
}
