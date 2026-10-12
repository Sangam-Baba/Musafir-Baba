import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";
import RiderDocument from "../models/rider/RiderDocument.js";
import PartnerAuth from "../models/partner/PartnerAuth.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerDocument from "../models/partner/PartnerDocument.js";
import { RideBooking } from "../models/RideBooking.js";

// Read-only analytics for the admin Fleet Dashboard (MBGO rider app +
// MBConnect partner app). Nothing in here writes to the database.
//
// Notes on what can and can't be measured with today's data:
// - Installs are not tracked by either app. "Devices" = profiles with a push
//   token (installed + logged in + allowed notifications).
// - lastLogin is only set on password login, so "active" combines logins with
//   real activity (booking / being assigned rides) to avoid undercounting.

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };
const IN_PROGRESS = ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"];
const AWAITING = ["PAID", "AWAITING_ASSIGNMENT"];
const CONFIRMED_STATUSES = new Set(["PAID", "AWAITING_ASSIGNMENT", ...IN_PROGRESS, "COMPLETED"]);
const ASSIGNED_STATUSES = new Set([...IN_PROGRESS, "COMPLETED"]);
const INACTIVE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TZ_OFFSET_MS = 330 * 60 * 1000; // bucket by India day (IST, UTC+5:30)

const dayKey = (date) => new Date(new Date(date).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

// Ordered list of bucket keys (days, or ISO weeks starting Monday for long ranges).
const buildBuckets = (start, end, weekly) => {
  const keys = [];
  const cursor = new Date(new Date(start).getTime() + TZ_OFFSET_MS);
  cursor.setUTCHours(0, 0, 0, 0);
  if (weekly) cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  const last = new Date(end.getTime() + TZ_OFFSET_MS);
  while (cursor <= last) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + (weekly ? 7 : 1));
  }
  return keys;
};

const bucketOf = (date, weekly) => {
  const d = new Date(new Date(date).getTime() + TZ_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  if (weekly) d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

// "Connaught Place, New Delhi, Delhi" -> "New Delhi" (city is usually the
// part before the state). cityName on rides is preferred when present.
const cityOf = (ride) => {
  if (ride.cityName && String(ride.cityName).trim()) return String(ride.cityName).trim();
  const parts = String(ride.pickup?.address || "")
    .split(",")
    .map((p) => p.replace(/\d{6}/g, "").trim())
    .filter((p) => p && p.toLowerCase() !== "india");
  if (parts.length === 0) return "Unknown";
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
};

const reachedStatus = (ride, statuses) =>
  statuses.has(ride.status) || (ride.statusHistory || []).some((h) => statuses.has(h.status));

// @route   GET /api/admin/fleet-analytics?range=7d|30d|90d|all
export const getFleetAnalytics = async (req, res) => {
  try {
    const range = RANGE_DAYS[req.query.range] ? req.query.range : req.query.range === "all" ? "all" : "30d";
    const now = new Date();
    const start = range === "all" ? null : new Date(now.getTime() - RANGE_DAYS[range] * DAY_MS);
    const inactiveCutoff = new Date(now.getTime() - INACTIVE_AFTER_DAYS * DAY_MS);
    const inRange = (date) => !!date && (!start || new Date(date) >= start);

    const [riderProfiles, riderAuths, partnerAuths, partnerProfiles, rides, pendingRiderDocs, pendingPartnerDocs] = await Promise.all([
      RiderProfile.find({ isDeleted: { $ne: true } }).select("authId fullName mobileNumber pushToken isVerified createdAt").lean(),
      RiderAuth.find({ status: { $ne: "Deleted" } }).select("lastLogin status").lean(),
      PartnerAuth.find({ status: { $ne: "Deleted" } }).select("status lastLogin createdAt email").lean(),
      PartnerProfile.find({ isDeleted: { $ne: true } }).select("authId fullName agencyName mobileNumber pushToken isOnline").lean(),
      RideBooking.find(start ? { createdAt: { $gte: start } } : {})
        .select("rider assignedPartnerId status statusHistory createdAt updatedAt totalAmount commissionAmount partnerPayout vehicleCategory tripType cityName pickup.address needsManualAssignment")
        .lean(),
      RiderDocument.countDocuments({ status: "Pending" }),
      PartnerDocument.countDocuments({ status: "Pending" }),
    ]);

    // Activity for "active / inactive" needs rides beyond the selected range too.
    const recentRides = await RideBooking.find({ $or: [{ createdAt: { $gte: inactiveCutoff } }, { updatedAt: { $gte: inactiveCutoff } }] })
      .select("rider assignedPartnerId createdAt updatedAt")
      .lean();

    // ---------- MBGO (riders) ----------
    const riderAuthById = new Map(riderAuths.map((a) => [String(a._id), a]));
    const liveRiders = riderProfiles.filter((p) => riderAuthById.has(String(p.authId)));
    const ridersBookedInRange = new Set(rides.map((r) => String(r.rider)));
    const ridersBookedRecently = new Set(recentRides.filter((r) => r.createdAt >= inactiveCutoff).map((r) => String(r.rider)));

    let activeRiders = 0;
    let recentlyActiveRiders = 0;
    for (const p of liveRiders) {
      const lastLogin = riderAuthById.get(String(p.authId))?.lastLogin;
      if (ridersBookedInRange.has(String(p._id)) || inRange(lastLogin)) activeRiders++;
      if (ridersBookedRecently.has(String(p._id)) || (lastLogin && new Date(lastLogin) >= inactiveCutoff)) recentlyActiveRiders++;
    }

    const mbgo = {
      totalUsers: liveRiders.length,
      newUsers: liveRiders.filter((p) => inRange(p.createdAt)).length,
      activeUsers: activeRiders,
      inactiveUsers: liveRiders.length - recentlyActiveRiders,
      devices: liveRiders.filter((p) => p.pushToken && String(p.pushToken).trim()).length,
      verifiedUsers: liveRiders.filter((p) => p.isVerified).length,
    };

    // ---------- MBConnect (partners) ----------
    const partnerProfileByAuth = new Map(partnerProfiles.map((p) => [String(p.authId), p]));
    const partnersAssignedInRange = new Set(
      rides.filter((r) => r.assignedPartnerId).map((r) => String(r.assignedPartnerId))
    );
    const partnersAssignedRecently = new Set(
      recentRides.filter((r) => r.assignedPartnerId && r.updatedAt >= inactiveCutoff).map((r) => String(r.assignedPartnerId))
    );

    let activePartners = 0;
    let recentlyActivePartners = 0;
    const statusCounts = {};
    for (const a of partnerAuths) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      const profileId = String(partnerProfileByAuth.get(String(a._id))?._id || "");
      if (partnersAssignedInRange.has(profileId) || inRange(a.lastLogin)) activePartners++;
      if (partnersAssignedRecently.has(profileId) || (a.lastLogin && new Date(a.lastLogin) >= inactiveCutoff)) recentlyActivePartners++;
    }
    const livePartnerProfiles = partnerProfiles.filter((p) => partnerAuths.some((a) => String(a._id) === String(p.authId)));

    const mbconnect = {
      totalPartners: partnerAuths.length,
      newPartners: partnerAuths.filter((a) => inRange(a.createdAt)).length,
      approvedPartners: (statusCounts.Approved || 0) + (statusCounts.Active || 0),
      pendingVerification: statusCounts.PendingVerification || 0,
      onlineNow: livePartnerProfiles.filter((p) => p.isOnline).length,
      activePartners,
      inactivePartners: partnerAuths.length - recentlyActivePartners,
      devices: livePartnerProfiles.filter((p) => p.pushToken && String(p.pushToken).trim()).length,
      statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    };

    // ---------- Rides & money ----------
    const count = (pred) => rides.filter(pred).length;
    const completedRides = rides.filter((r) => r.status === "COMPLETED");
    const sum = (list, field) => list.reduce((s, r) => s + (Number(r[field]) || 0), 0);

    const ridesSummary = {
      total: rides.length,
      completed: completedRides.length,
      cancelled: count((r) => r.status === "CANCELLED"),
      inProgress: count((r) => IN_PROGRESS.includes(r.status)),
      awaitingPartner: count((r) => AWAITING.includes(r.status)),
      paymentPending: count((r) => r.status === "PAYMENT_PENDING"),
      gmv: sum(completedRides, "totalAmount"),
      commission: sum(completedRides, "commissionAmount"),
      partnerPayout: sum(completedRides, "partnerPayout"),
      avgFare: completedRides.length ? Math.round(sum(completedRides, "totalAmount") / completedRides.length) : 0,
    };
    ridesSummary.cancellationRate = rides.length ? Math.round((ridesSummary.cancelled / rides.length) * 1000) / 10 : 0;

    const funnel = [
      { stage: "Booked", count: rides.length },
      { stage: "Confirmed (paid)", count: count((r) => reachedStatus(r, CONFIRMED_STATUSES)) },
      { stage: "Partner assigned", count: count((r) => !!r.assignedPartnerId || reachedStatus(r, ASSIGNED_STATUSES)) },
      { stage: "Completed", count: completedRides.length },
    ];

    // ---------- Trends ----------
    const trendStart = start || [
      ...liveRiders.map((p) => p.createdAt),
      ...partnerAuths.map((a) => a.createdAt),
      ...rides.map((r) => r.createdAt),
    ].filter(Boolean).reduce((min, d) => (new Date(d) < min ? new Date(d) : min), now);
    const weekly = (now.getTime() - new Date(trendStart).getTime()) / DAY_MS > 120;
    const buckets = buildBuckets(trendStart, now, weekly);
    const signupMap = new Map(buckets.map((k) => [k, { date: k, riders: 0, partners: 0 }]));
    const rideMap = new Map(buckets.map((k) => [k, { date: k, completed: 0, inProgress: 0, cancelled: 0, unpaid: 0 }]));

    for (const p of liveRiders) if (inRange(p.createdAt)) signupMap.get(bucketOf(p.createdAt, weekly)) && signupMap.get(bucketOf(p.createdAt, weekly)).riders++;
    for (const a of partnerAuths) if (inRange(a.createdAt)) signupMap.get(bucketOf(a.createdAt, weekly)) && signupMap.get(bucketOf(a.createdAt, weekly)).partners++;
    for (const r of rides) {
      const b = rideMap.get(bucketOf(r.createdAt, weekly));
      if (!b) continue;
      if (r.status === "COMPLETED") b.completed++;
      else if (r.status === "CANCELLED") b.cancelled++;
      else if (r.status === "PAYMENT_PENDING") b.unpaid++;
      else b.inProgress++;
    }

    // ---------- Breakdowns ----------
    const groupCount = (list, keyFn) => {
      const m = new Map();
      for (const item of list) {
        const k = keyFn(item) || "Unknown";
        m.set(k, (m.get(k) || 0) + 1);
      }
      return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };

    // ---------- Leaderboards ----------
    const partnerProfileById = new Map(partnerProfiles.map((p) => [String(p._id), p]));
    const partnerBoard = new Map();
    for (const r of completedRides) {
      if (!r.assignedPartnerId) continue;
      const k = String(r.assignedPartnerId);
      const row = partnerBoard.get(k) || { rides: 0, earnings: 0 };
      row.rides++;
      row.earnings += Number(r.partnerPayout) || 0;
      partnerBoard.set(k, row);
    }
    const topPartners = [...partnerBoard.entries()]
      .map(([id, row]) => {
        const p = partnerProfileById.get(id);
        return { id, name: p?.agencyName || p?.fullName || "Partner", mobile: p?.mobileNumber || "", ...row };
      })
      .sort((a, b) => b.rides - a.rides || b.earnings - a.earnings)
      .slice(0, 5);

    const riderById = new Map(riderProfiles.map((p) => [String(p._id), p]));
    const riderBoard = new Map();
    for (const r of rides) {
      const k = String(r.rider);
      const row = riderBoard.get(k) || { bookings: 0, completed: 0, spent: 0 };
      row.bookings++;
      if (r.status === "COMPLETED") {
        row.completed++;
        row.spent += Number(r.totalAmount) || 0;
      }
      riderBoard.set(k, row);
    }
    const topRiders = [...riderBoard.entries()]
      .map(([id, row]) => ({ id, name: riderById.get(id)?.fullName || "Rider", mobile: riderById.get(id)?.mobileNumber || "", ...row }))
      .sort((a, b) => b.completed - a.completed || b.bookings - a.bookings)
      .slice(0, 5);

    // ---------- Needs attention (current state, not range-bound) ----------
    const [manualAssignment, awaitingPartnerNow] = await Promise.all([
      RideBooking.countDocuments({ needsManualAssignment: true, status: { $nin: ["COMPLETED", "CANCELLED"] } }),
      RideBooking.countDocuments({ status: { $in: AWAITING } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        range,
        generatedAt: now,
        bucket: weekly ? "week" : "day",
        mbgo,
        mbconnect,
        rides: ridesSummary,
        funnel,
        signupTrend: [...signupMap.values()],
        rideTrend: [...rideMap.values()],
        vehicleSplit: groupCount(rides, (r) => r.vehicleCategory),
        tripTypeSplit: groupCount(rides, (r) => (r.tripType === "ROUND_TRIP" ? "Round trip" : r.tripType === "ONE_WAY" ? "One way" : r.tripType)),
        topCities: groupCount(rides, cityOf).slice(0, 6),
        topPartners,
        topRiders,
        attention: {
          manualAssignment,
          awaitingPartner: awaitingPartnerNow,
          partnersPendingVerification: mbconnect.pendingVerification,
          riderDocsPending: pendingRiderDocs,
          partnerDocsPending: pendingPartnerDocs,
        },
      },
    });
  } catch (error) {
    console.error("Fleet Analytics Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
