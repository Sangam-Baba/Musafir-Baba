import PartnerAuth from "../models/partner/PartnerAuth.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import PartnerVehicle from "../models/partner/PartnerVehicle.js";
import { PartnerSettings } from "../models/partner/PartnerSettings.js";
import { PartnerTestRideConfig, PartnerTestRideBroadcast, PartnerTestRide, TEST_RIDE_CONFIG_KEY } from "../models/partner/PartnerTestRide.js";
import { notifyUser } from "./notification/notificationService.js";
import { getApprovedAuthIdSet } from "./partnerAccount.service.js";
import { vehicleServiceCities } from "./rideDispatch.service.js";

// MBConnect Test Rides: admin broadcasts sample ride alerts. Always badged
// "TEST RIDE" (not configurable) and can never be accepted. Each driver gets
// their own ride(s) built from their vehicle's work-location city, a random
// rider name and the admin's settings. Nothing here reads or writes real
// RideBooking data.

export const TEST_BADGE = "";

export const DEFAULT_RIDER_NAMES = [
  "Aarav Sharma", "Aditi Verma", "Aditya Singh", "Akash Gupta", "Amit Kumar", "Ananya Iyer", "Anil Yadav", "Anjali Mehta", "Ankit Jain", "Anushka Rao",
  "Arjun Nair", "Aryan Chauhan", "Ayesha Khan", "Deepak Mishra", "Deepika Reddy", "Dev Patel", "Divya Pillai", "Gaurav Saxena", "Harsh Agarwal", "Ishaan Malhotra",
  "Isha Kapoor", "Kabir Bhatia", "Karan Arora", "Kavya Menon", "Kiran Joshi", "Kunal Sinha", "Lakshmi Narayan", "Manish Tiwari", "Meera Krishnan", "Mohit Bansal",
  "Nandini Desai", "Naveen Chandra", "Neha Srivastava", "Nikhil Kulkarni", "Nisha Pandey", "Pankaj Dubey", "Pooja Thakur", "Pranav Bhat", "Priya Sharma", "Rahul Verma",
  "Rajesh Khanna", "Rakesh Rawat", "Ravi Shankar", "Ritika Sethi", "Rohan Das", "Rohit Chaudhary", "Sakshi Garg", "Sameer Qureshi", "Sandeep Negi", "Sanjana Bose",
  "Saurabh Pathak", "Shreya Ghosh", "Shivam Tripathi", "Simran Kaur", "Sneha Patil", "Sonal Jindal", "Sumit Rathore", "Sunita Devi", "Suresh Babu", "Swati Mittal",
  "Tanvi Shah", "Tarun Bajaj", "Uday Kiran", "Varun Dhawan", "Vikas Rana", "Vikram Rathod", "Vinay Hegde", "Vivek Anand", "Yash Goyal", "Zoya Siddiqui",
  "Abhishek Tyagi", "Alok Prasad", "Amrita Sen", "Bhavna Soni", "Chetan Shetty", "Dinesh Karthik", "Farhan Ali", "Gita Rani", "Hemant Lodha", "Jyoti Kumari",
  "Komal Ahuja", "Lalit Mohan", "Madhuri Pawar", "Manoj Bhardwaj", "Mansi Arya", "Mukesh Jha", "Nitin Gadkari", "Payal Chopra", "Prakash Rao", "Preeti Bhalla",
  "Puneet Sood", "Radha Krishnan", "Rajat Kohli", "Ramesh Iyer", "Reena Dutta", "Sachin Pal", "Shalini Pathania", "Shubham Mishra", "Sonia Malik", "Tushar Wagh",
  "Usha Kiran", "Vandana Sharma", "Vijay Kumar", "Yogesh Bhatt", "Ajay Rawal", "Alka Yadav", "Anurag Basu", "Bharat Joshi", "Charu Agarwal", "Darshan Gowda",
  "Ekta Bhatia", "Girish Nair", "Heena Shaikh", "Jatin Vohra", "Kriti Saini", "Lokesh Rajput", "Mayank Goel", "Nupur Jain", "Omkar Deshmukh", "Parul Tandon",
];

export const DEFAULT_GENERIC_PLACES = [
  "Railway Station, {city}",
  "Airport, {city}",
  "Bus Stand, {city}",
  "City Centre, {city}",
  "Main Market, {city}",
  "Civil Lines, {city}",
  "Old City, {city}",
  "Collectorate, {city}",
  "District Hospital, {city}",
  "Clock Tower, {city}",
];

export const DEFAULT_TEST_RIDE_CONFIG = {
  riderNames: DEFAULT_RIDER_NAMES,
  cityPlaces: [],
  genericPlaces: DEFAULT_GENERIC_PLACES,
  tripMix: { oneWay: 50, roundTrip: 20, outstation: 30 },
  distanceKm: { local: { min: 8, max: 40 }, outstation: { min: 120, max: 450 } },
  perKm: { min: 12, max: 18 },
  visibleMinutes: 30,
  notificationTitle: "New ride available",
  notificationMessage: "{pickup} → {drop} • ₹{fare}",
  acceptMessage: "This ride is already accepted or expired. It can't be accepted again.",
};

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clean = (list) => [...new Set((list || []).map((s) => String(s || "").trim()).filter(Boolean))];

export function normalizeTestRideConfig(doc) {
  const c = doc || {};
  const d = DEFAULT_TEST_RIDE_CONFIG;
  const range = (r, dr) => {
    const min = Math.max(0, num(r?.min, dr.min));
    return { min, max: Math.max(min, num(r?.max, dr.max)) };
  };
  const names = clean(c.riderNames);
  const generic = clean(c.genericPlaces);
  return {
    riderNames: names.length ? names : d.riderNames,
    cityPlaces: (c.cityPlaces || []).map((x) => ({ city: String(x.city || "").trim(), places: clean(x.places) })).filter((x) => x.city && x.places.length),
    genericPlaces: generic.length ? generic : d.genericPlaces,
    tripMix: {
      oneWay: Math.max(0, num(c.tripMix?.oneWay, d.tripMix.oneWay)),
      roundTrip: Math.max(0, num(c.tripMix?.roundTrip, d.tripMix.roundTrip)),
      outstation: Math.max(0, num(c.tripMix?.outstation, d.tripMix.outstation)),
    },
    distanceKm: { local: range(c.distanceKm?.local, d.distanceKm.local), outstation: range(c.distanceKm?.outstation, d.distanceKm.outstation) },
    perKm: range(c.perKm, d.perKm),
    visibleMinutes: Math.min(24 * 60, Math.max(1, Math.round(num(c.visibleMinutes, d.visibleMinutes)))),
    notificationTitle: String(c.notificationTitle || d.notificationTitle).slice(0, 120),
    notificationMessage: String(c.notificationMessage || d.notificationMessage).slice(0, 300),
    acceptMessage: String(c.acceptMessage || d.acceptMessage).slice(0, 300),
  };
}

export async function getTestRideConfig() {
  return normalizeTestRideConfig(await PartnerTestRideConfig.findOne({ key: TEST_RIDE_CONFIG_KEY }).lean());
}

// ---------------- Pure generation (unit-tested) ----------------

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];
const between = (r, rnd) => r.min + rnd() * (r.max - r.min);
const sameCity = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// Places for a city: admin's list for that city, else the generic templates.
export function placesForCity(cfg, city) {
  const own = cfg.cityPlaces.find((c) => sameCity(c.city, city));
  if (own?.places.length) return own.places.map((p) => (/,/.test(p) ? p : `${p}, ${city}`));
  return cfg.genericPlaces.map((p) => p.replace(/\{city\}/g, city));
}

// "{pickup} → {drop} • ₹{fare}" with the ride's values.
export function fillTemplate(text, ride) {
  return String(text || "").replace(/\{(\w+)\}/g, (m, k) => {
    const v = { pickup: ride.pickup, drop: ride.drop, fare: Number(ride.fare).toLocaleString("en-IN"), name: ride.riderName, city: ride.city, vehicle: ride.vehicleCategory, distance: `${ride.distanceKm} km`, date: ride.rideDate, time: ride.rideTime }[k];
    return v === undefined ? m : v;
  });
}

// The title always carries the TEST RIDE badge (not removable from settings).
export const badgeTitle = (title) => `${TEST_BADGE} · ${String(title || "").replace(/^\s*(?:🧪\s*)?TEST RIDE\s*[·:-]?\s*/iu, "")}`;

// IST date/time strings in the same shapes RideBooking uses.
export function istDateTime(d) {
  const ist = new Date(d.getTime() + 5.5 * 3600e3);
  const h = ist.getUTCHours(), m = ist.getUTCMinutes();
  return { rideDate: ist.toISOString().slice(0, 10), rideTime: `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}` };
}

/**
 * One test ride for a driver.
 * driver: { city, vehicleCategory, otherCities: [] }
 */
export function generateTestRide(cfg, driver, now = new Date(), rnd = Math.random) {
  const mix = cfg.tripMix;
  const total = mix.oneWay + mix.roundTrip + mix.outstation || 1;
  const x = rnd() * total;
  const outstationCities = (driver.otherCities || []).filter((c) => !sameCity(c, driver.city));
  let tripType = x < mix.oneWay ? "ONE_WAY" : x < mix.oneWay + mix.roundTrip ? "ROUND_TRIP" : "OUTSTATION";
  if (tripType === "OUTSTATION" && !outstationCities.length) tripType = "ONE_WAY";

  const local = placesForCity(cfg, driver.city);
  const pickup = pick(local, rnd);
  let drop;
  let km;
  if (tripType === "OUTSTATION") {
    const destCity = pick(outstationCities, rnd);
    drop = pick(placesForCity(cfg, destCity), rnd);
    km = between(cfg.distanceKm.outstation, rnd);
  } else {
    const others = local.filter((p) => p !== pickup);
    drop = others.length ? pick(others, rnd) : pickup;
    km = between(cfg.distanceKm.local, rnd);
  }
  km = Math.max(1, Math.round(km));
  const fare = Math.round((km * (tripType === "ROUND_TRIP" ? 2 : 1) * between(cfg.perKm, rnd)) / 10) * 10;
  // Pickup between 1 hour and 2 days from now, on a 15-minute mark.
  const when = new Date(now.getTime() + (60 + rnd() * 47 * 60) * 60000);
  when.setUTCMinutes(Math.round(when.getUTCMinutes() / 15) * 15, 0, 0);
  return {
    riderName: pick(cfg.riderNames, rnd),
    city: driver.city,
    pickup,
    drop,
    tripType,
    distanceKm: km,
    fare: Math.max(100, fare),
    vehicleCategory: driver.vehicleCategory,
    ...istDateTime(when),
  };
}

// ---------------- Targets ----------------

/**
 * Approved drivers to send to, with the city / vehicle each test ride is built from.
 * target: CITIES (cities[]), ONLINE (cities[] optional), SELECTED (partnerAuthIds[])
 */
export async function resolveTargets({ target, cities = [], partnerAuthIds = [] }) {
  const filter = { isDeleted: { $ne: true } };
  if (target === "SELECTED") filter.authId = { $in: partnerAuthIds };
  if (target === "ONLINE") filter.isOnline = true;
  const profiles = await PartnerProfile.find(filter).select("_id authId fullName pushToken pricingConfig isOnline").lean();
  const approved = await getApprovedAuthIdSet(profiles.map((p) => p.authId));
  const list = profiles.filter((p) => approved.has(String(p.authId)));
  const [vehicles, settings] = await Promise.all([
    PartnerVehicle.find({ partnerId: { $in: list.map((p) => p._id) }, status: "Active", isDeleted: { $ne: true } }).select("partnerId category").lean(),
    PartnerSettings.find({ authId: { $in: list.map((p) => p.authId) } }).lean(),
  ]);
  const settingsBy = new Map(settings.map((s) => [String(s.authId), s]));
  const wanted = cities.map((c) => String(c).trim().toLowerCase()).filter(Boolean);
  const out = [];
  let skipped = 0;
  for (const p of list) {
    const vs = vehicles.filter((v) => String(v.partnerId) === String(p._id));
    const options = [];
    for (const v of vs) {
      const cs = [...new Set(vehicleServiceCities(v, settingsBy.get(String(p.authId)), p).filter(Boolean))];
      for (const c of cs) options.push({ city: c, vehicleCategory: v.category, cities: cs });
    }
    // No active vehicle / work city: a ride can't be built for them.
    if (!options.length) {
      skipped += 1;
      continue;
    }
    const inCity = wanted.length ? options.filter((o) => wanted.includes(o.city.trim().toLowerCase())) : options;
    if (!inCity.length) continue; // works elsewhere: not part of this broadcast
    const allCities = [...new Set(options.map((o) => o.city))];
    out.push({ profile: p, options: inCity, allCities });
  }
  return { drivers: out, skipped };
}

// Every city that approved drivers work in (for the admin picker).
export async function listWorkCities() {
  const { drivers } = await resolveTargets({ target: "CITIES" });
  const counts = new Map();
  for (const d of drivers) for (const c of new Set(d.options.map((o) => o.city))) counts.set(c, (counts.get(c) || 0) + 1);
  return [...counts.entries()].map(([city, drivers]) => ({ city, drivers })).sort((a, b) => b.drivers - a.drivers);
}

// ---------------- Broadcast ----------------

export async function previewBroadcast(input, sample = 5) {
  const cfg = await getTestRideConfig();
  const { drivers, skipped } = await resolveTargets(input);
  const rides = drivers.slice(0, sample).map((d) => {
    const o = pick(d.options, Math.random);
    const ride = generateTestRide(cfg, { city: o.city, vehicleCategory: o.vehicleCategory, otherCities: [...new Set([...d.allCities, ...cfg.cityPlaces.map((c) => c.city)])] });
    return { driver: d.profile.fullName, ...ride, notificationTitle: badgeTitle(cfg.notificationTitle), notificationMessage: fillTemplate(cfg.notificationMessage, ride) };
  });
  return { driverCount: drivers.length, skipped, rides };
}

export async function runBroadcast(input, staff) {
  const cfg = await getTestRideConfig();
  const ridesPerDriver = Math.min(3, Math.max(1, Math.round(Number(input.ridesPerDriver) || 1)));
  const visibleMinutes = Math.min(24 * 60, Math.max(1, Math.round(Number(input.visibleMinutes) || cfg.visibleMinutes)));
  const sendPush = input.sendPush !== false;
  const { drivers, skipped } = await resolveTargets(input);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + visibleMinutes * 60000);
  const broadcast = await PartnerTestRideBroadcast.create({
    target: input.target,
    cities: input.cities || [],
    partnerAuthIds: input.target === "SELECTED" ? input.partnerAuthIds : [],
    ridesPerDriver,
    sendPush,
    visibleMinutes,
    expiresAt,
    driverCount: drivers.length,
    rideCount: drivers.length * ridesPerDriver,
    skipped,
    createdById: staff.id,
    createdBy: staff.name,
  });
  const extraCities = cfg.cityPlaces.map((c) => c.city);
  const docs = [];
  for (const d of drivers) {
    for (let i = 0; i < ridesPerDriver; i++) {
      const o = pick(d.options, Math.random);
      const ride = generateTestRide(cfg, { city: o.city, vehicleCategory: o.vehicleCategory, otherCities: [...new Set([...d.allCities, ...extraCities])] }, now);
      docs.push({ ...ride, broadcastId: broadcast._id, partnerAuthId: d.profile.authId, expiresAt, _profile: d.profile });
    }
  }
  const saved = await PartnerTestRide.insertMany(docs.map(({ _profile, ...doc }) => doc));
  // Notify (same shape as a real "New ride available", always with the TEST RIDE badge).
  for (let i = 0; i < saved.length; i++) {
    const profile = docs[i]._profile;
    notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title: badgeTitle(cfg.notificationTitle),
      message: fillTemplate(cfg.notificationMessage, saved[i]),
      type: "Trip",
      data: { testRideId: String(saved[i]._id), isTestRide: true },
      pushToken: profile.pushToken,
      sendPush,
    }).catch((e) => console.error("Test ride notification error:", e.message));
  }
  return broadcast;
}
