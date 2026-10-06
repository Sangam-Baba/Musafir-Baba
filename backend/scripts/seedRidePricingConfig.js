// One-off, additive seed for the MBGo admin rate card (RidePricingConfig).
//
// Creates the config document with the default rate card and the master
// switch OFF, so ride pricing keeps working exactly as before until an admin
// turns it on.
//
// Safe to run multiple times: if the config already exists it is left
// completely untouched (never overwrites admin edits, never flips the switch).
//
// Usage:
//   node scripts/seedRidePricingConfig.js --dry-run   (print only, no DB writes)
//   node scripts/seedRidePricingConfig.js

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { RidePricingConfig, RIDE_PRICING_CONFIG_KEY } from "../src/models/RidePricingConfig.js";
import { DEFAULT_RIDE_RATE_CARD } from "../src/config/defaultRideRateCard.js";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const seedDoc = new RidePricingConfig({
    key: RIDE_PRICING_CONFIG_KEY,
    enabled: false,
    vehicleTypes: DEFAULT_RIDE_RATE_CARD,
  });

  const validationError = seedDoc.validateSync();
  if (validationError) throw validationError;

  if (isDryRun) {
    console.log("[dry-run] Would create RidePricingConfig (only if none exists):");
    console.log(JSON.stringify(seedDoc.toObject(), null, 2));
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const existing = await RidePricingConfig.findOne({ key: RIDE_PRICING_CONFIG_KEY }).lean();
    if (existing) {
      console.log(`RidePricingConfig already exists (enabled: ${existing.enabled}) -- left untouched.`);
      return;
    }
    await seedDoc.save();
    console.log(`Created RidePricingConfig with ${DEFAULT_RIDE_RATE_CARD.length} vehicle types (enabled: false).`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Seed Ride Pricing Config Error:", error.message);
  process.exit(1);
});
