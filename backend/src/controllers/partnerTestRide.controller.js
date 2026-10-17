import mongoose from "mongoose";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import { Staff } from "../models/Staff.js";
import { PartnerTestRideConfig, PartnerTestRideBroadcast, PartnerTestRide, TEST_RIDE_CONFIG_KEY } from "../models/partner/PartnerTestRide.js";
import {
  getTestRideConfig,
  normalizeTestRideConfig,
  listWorkCities,
  resolveTargets,
  previewBroadcast,
  runBroadcast,
  TEST_BADGE,
} from "../services/partnerTestRide.service.js";
import { getApprovedAuthIdSet } from "../services/partnerAccount.service.js";

// MBConnect Test Rides -- driver endpoints (/api/partner/test-rides) and admin
// endpoints (/api/admin/partner-test-rides). Separate from real rides.

const fail = (res, e, label) => {
  console.error(`${label} error:`, e.message);
  return res.status(500).json({ success: false, message: "Server Error" });
};
const staffOf = async (req) => {
  let name = req.user?.name;
  if (!name) {
    try {
      name = (await Staff.findById(req.user?.sub).select("name").lean())?.name;
    } catch {}
  }
  return { id: mongoose.isValidObjectId(req.user?.sub) ? req.user.sub : undefined, name: name || "Admin" };
};

// ---------------- Driver ----------------

// GET /api/partner/test-rides  -- active test rides for this driver (Available tab)
export const getMyTestRides = async (req, res) => {
  try {
    const now = new Date();
    const rides = await PartnerTestRide.find({ partnerAuthId: req.partnerId, expiresAt: { $gt: now } }).sort({ createdAt: -1 }).limit(10).lean();
    const unseen = rides.filter((r) => !r.seenAt).map((r) => r._id);
    if (unseen.length) await PartnerTestRide.updateMany({ _id: { $in: unseen } }, { $set: { seenAt: now } });
    return res.json({
      success: true,
      data: rides.map((r) => ({
        id: String(r._id),
        isTestRide: true,
        badge: TEST_BADGE,
        riderName: r.riderName,
        pickupLocation: r.pickup,
        dropoffLocation: r.drop,
        pickupTime: r.rideTime,
        date: r.rideDate,
        fare: r.fare,
        vehicleCategory: r.vehicleCategory,
        distance: `${r.distanceKm} km`,
        tripType: r.tripType,
      })),
    });
  } catch (e) {
    return fail(res, e, "Get test rides");
  }
};

// POST /api/partner/test-rides/:id/accept  -- never accepts; records the tap.
export const tapTestRide = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const cfg = await getTestRideConfig();
    const now = new Date();
    const r = await PartnerTestRide.findOneAndUpdate(
      { _id: req.params.id, partnerAuthId: req.partnerId },
      { $inc: { acceptTaps: 1 } },
      { new: true }
    );
    if (!r) return res.status(404).json({ success: false, message: "Not found" });
    if (!r.firstAcceptTapAt) await PartnerTestRide.updateOne({ _id: r._id, firstAcceptTapAt: null }, { $set: { firstAcceptTapAt: now } });
    return res.json({ success: true, accepted: false, isTestRide: true, message: cfg.acceptMessage });
  } catch (e) {
    return fail(res, e, "Tap test ride");
  }
};

// ---------------- Admin ----------------

// GET /config
export const getConfig = async (req, res) => {
  try {
    return res.json({ success: true, data: await getTestRideConfig(), badge: TEST_BADGE });
  } catch (e) {
    return fail(res, e, "Get test ride config");
  }
};

// PUT /config
export const updateConfig = async (req, res) => {
  try {
    const b = req.body || {};
    const merged = normalizeTestRideConfig({ ...(await getTestRideConfig()), ...b });
    const mix = merged.tripMix;
    if (mix.oneWay + mix.roundTrip + mix.outstation <= 0) return res.status(400).json({ success: false, message: "Trip mix must add up to more than 0" });
    const doc = await PartnerTestRideConfig.findOneAndUpdate({ key: TEST_RIDE_CONFIG_KEY }, { $set: merged }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return res.json({ success: true, data: normalizeTestRideConfig(doc) });
  } catch (e) {
    return fail(res, e, "Update test ride config");
  }
};

// GET /cities  -- work cities of approved drivers
export const getCities = async (req, res) => {
  try {
    return res.json({ success: true, data: await listWorkCities() });
  } catch (e) {
    return fail(res, e, "Test ride cities");
  }
};

// GET /drivers?q=  -- approved drivers to hand-pick
export const getDrivers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = { isDeleted: { $ne: true } };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ fullName: rx }, { mobileNumber: rx }];
    }
    const profiles = await PartnerProfile.find(filter).select("authId fullName mobileNumber isOnline").sort({ fullName: 1 }).limit(300).lean();
    const approved = await getApprovedAuthIdSet(profiles.map((p) => p.authId));
    return res.json({ success: true, data: profiles.filter((p) => approved.has(String(p.authId))).slice(0, 100) });
  } catch (e) {
    return fail(res, e, "Test ride drivers");
  }
};

function readInput(body = {}) {
  const target = ["CITIES", "ONLINE", "SELECTED"].includes(body.target) ? body.target : null;
  if (!target) return { error: "Choose who receives the test rides" };
  const cities = Array.isArray(body.cities) ? body.cities.map(String).filter(Boolean) : [];
  const partnerAuthIds = Array.isArray(body.partnerAuthIds) ? body.partnerAuthIds.filter((x) => mongoose.isValidObjectId(x)) : [];
  if (target === "CITIES" && !cities.length) return { error: "Pick at least one city" };
  if (target === "SELECTED" && !partnerAuthIds.length) return { error: "Pick at least one driver" };
  return { value: { target, cities, partnerAuthIds, ridesPerDriver: body.ridesPerDriver, visibleMinutes: body.visibleMinutes, sendPush: body.sendPush } };
}

// POST /preview
export const preview = async (req, res) => {
  try {
    const { value, error } = readInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    return res.json({ success: true, data: await previewBroadcast(value) });
  } catch (e) {
    return fail(res, e, "Preview test rides");
  }
};

// POST /broadcast
export const broadcast = async (req, res) => {
  try {
    const { value, error } = readInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const { drivers } = await resolveTargets(value);
    if (!drivers.length) return res.status(400).json({ success: false, message: "No approved drivers match this selection (drivers need an active vehicle and a work location)." });
    const b = await runBroadcast(value, await staffOf(req));
    return res.status(201).json({ success: true, data: b, message: `Sent ${b.rideCount} test rides to ${b.driverCount} drivers.` });
  } catch (e) {
    return fail(res, e, "Broadcast test rides");
  }
};

// GET /broadcasts  -- history with seen / accept-tap stats
export const listBroadcasts = async (req, res) => {
  try {
    const items = await PartnerTestRideBroadcast.find().sort({ createdAt: -1 }).limit(100).lean();
    const stats = await PartnerTestRide.aggregate([
      { $match: { broadcastId: { $in: items.map((i) => i._id) } } },
      {
        $group: {
          _id: "$broadcastId",
          seen: { $sum: { $cond: [{ $ifNull: ["$seenAt", false] }, 1, 0] } },
          tapped: { $sum: { $cond: [{ $gt: ["$acceptTaps", 0] }, 1, 0] } },
          taps: { $sum: "$acceptTaps" },
        },
      },
    ]);
    const by = new Map(stats.map((s) => [String(s._id), s]));
    const now = Date.now();
    return res.json({
      success: true,
      data: items.map((i) => ({
        ...i,
        active: !i.endedAt && new Date(i.expiresAt).getTime() > now,
        seen: by.get(String(i._id))?.seen || 0,
        tapped: by.get(String(i._id))?.tapped || 0,
        taps: by.get(String(i._id))?.taps || 0,
      })),
    });
  } catch (e) {
    return fail(res, e, "List test ride broadcasts");
  }
};

// POST /broadcasts/:id/end  -- hide its test rides now
export const endBroadcast = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const staff = await staffOf(req);
    const now = new Date();
    const b = await PartnerTestRideBroadcast.findOneAndUpdate({ _id: req.params.id, endedAt: null }, { $set: { endedAt: now, endedBy: staff.name } }, { new: true });
    if (!b) return res.status(409).json({ success: false, message: "Already ended" });
    await PartnerTestRide.updateMany({ broadcastId: b._id, expiresAt: { $gt: now } }, { $set: { expiresAt: now } });
    return res.json({ success: true, data: b });
  } catch (e) {
    return fail(res, e, "End test ride broadcast");
  }
};
