// One-off, additive seed script for realistic demo ride-booking data.
// Creates 4 new demo partners (one per vehicle category) with Active vehicles
// and full pricing/service-area settings, so `/ride/quote` returns real,
// realistic multi-category offers for common Indian routes during testing.
//
// Safe to run multiple times: it upserts by a fixed demo email per partner,
// so it never creates duplicates and never touches any existing (non-demo)
// partner record.
//
// Usage: node scripts/seedDemoRideData.js

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import PartnerAuth from "../src/models/partner/PartnerAuth.js";
import PartnerProfile from "../src/models/partner/PartnerProfile.js";
import PartnerVehicle from "../src/models/partner/PartnerVehicle.js";
import { PartnerSettings } from "../src/models/partner/PartnerSettings.js";

const SERVICEABLE_CITIES = [
  { city: "New Delhi", state: "Delhi" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Haridwar", state: "Uttarakhand" },
  { city: "Rishikesh", state: "Uttarakhand" },
  { city: "Shimla", state: "Himachal Pradesh" },
].map((l) => ({ ...l, country: "India", address: `${l.city} City Center` }));

const DEMO_PARTNERS = [
  {
    email: "demo.hatchback@mbgo-seed.internal",
    fullName: "Rohit Sharma",
    mobileNumber: "9810000001",
    category: "Hatchback",
    brand: "Maruti Suzuki",
    model: "Swift VXI",
    vehicleName: "Maruti Swift",
    seatingCapacity: 5,
    registrationNumber: "DL01HB1234",
    perKmRate: 11,
    fullDayRate: 2200,
  },
  {
    email: "demo.sedan@mbgo-seed.internal",
    fullName: "Amit Verma",
    mobileNumber: "9810000002",
    category: "Sedan",
    brand: "Maruti Suzuki",
    model: "Dzire VDI",
    vehicleName: "Maruti Dzire",
    seatingCapacity: 4,
    registrationNumber: "DL02SD5678",
    perKmRate: 13,
    fullDayRate: 2600,
  },
  {
    email: "demo.suv@mbgo-seed.internal",
    fullName: "Suresh Yadav",
    mobileNumber: "9810000003",
    category: "SUV",
    brand: "Toyota",
    model: "Innova Crysta",
    vehicleName: "Toyota Innova Crysta",
    seatingCapacity: 7,
    registrationNumber: "DL03SV9012",
    perKmRate: 17,
    fullDayRate: 3400,
  },
  {
    email: "demo.tempo@mbgo-seed.internal",
    fullName: "Vikram Singh",
    mobileNumber: "9810000004",
    category: "Tempo Traveller",
    brand: "Force Motors",
    model: "Traveller 3350",
    vehicleName: "Force Tempo Traveller",
    seatingCapacity: 12,
    registrationNumber: "DL04TT3456",
    perKmRate: 22,
    fullDayRate: 4500,
  },
];

async function seedPartner(def) {
  const hashedPassword = await bcrypt.hash("MbgoDemo@123", 10);

  let auth = await PartnerAuth.findOne({ email: def.email });
  if (!auth) {
    auth = await PartnerAuth.create({
      email: def.email,
      password: hashedPassword,
      isEmailVerified: true,
      status: "Active",
    });
    console.log(`Created PartnerAuth for ${def.email}`);
  } else {
    console.log(`PartnerAuth already exists for ${def.email}`);
  }

  let profile = await PartnerProfile.findOne({ authId: auth._id });
  if (!profile) {
    profile = await PartnerProfile.create({
      authId: auth._id,
      fullName: def.fullName,
      mobileNumber: def.mobileNumber,
      partnerType: "Individual",
      isSubmittedForApproval: true,
      isOnline: true,
    });
    console.log(`Created PartnerProfile for ${def.fullName}`);
  } else {
    console.log(`PartnerProfile already exists for ${def.fullName}`);
  }

  let vehicle = await PartnerVehicle.findOne({ registrationNumber: def.registrationNumber });
  if (!vehicle) {
    vehicle = await PartnerVehicle.create({
      partnerId: profile._id,
      category: def.category,
      seatingCapacity: def.seatingCapacity,
      brand: def.brand,
      model: def.model,
      vehicleName: def.vehicleName,
      registrationNumber: def.registrationNumber,
      color: "White",
      status: "Active",
    });
    console.log(`Created PartnerVehicle ${def.vehicleName} (${def.registrationNumber})`);
  } else {
    console.log(`PartnerVehicle already exists: ${def.registrationNumber}`);
  }

  let settings = await PartnerSettings.findOne({ authId: auth._id });
  const vehicleConfig = {
    vehicleId: String(vehicle._id),
    vehicleName: def.vehicleName,
    registrationNumber: def.registrationNumber,
    perKmRate: def.perKmRate,
    fullDayRate: def.fullDayRate,
    locations: SERVICEABLE_CITIES,
  };

  if (!settings) {
    settings = await PartnerSettings.create({
      authId: auth._id,
      vehicleConfigs: [vehicleConfig],
    });
    console.log(`Created PartnerSettings for ${def.fullName}`);
  } else {
    const hasConfig = settings.vehicleConfigs.some((c) => c.registrationNumber === def.registrationNumber);
    if (!hasConfig) {
      settings.vehicleConfigs.push(vehicleConfig);
      await settings.save();
      console.log(`Added vehicle config to existing PartnerSettings for ${def.fullName}`);
    } else {
      console.log(`PartnerSettings already has config for ${def.registrationNumber}`);
    }
  }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Seeding demo ride data...\n");

  for (const def of DEMO_PARTNERS) {
    await seedPartner(def);
    console.log("");
  }

  console.log("Done.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
