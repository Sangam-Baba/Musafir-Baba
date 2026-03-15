import mongoose from "mongoose";
import dotenv from "dotenv";
import { Vehicle } from "./src/models/Vehicle.js";
import { Destination } from "./src/models/Destination.js";
import { VehiclePickUpDestination } from "./src/models/VehiclePickUpDestination.js";
import { VehicleBrand } from "./src/models/VehicleBrand.js";
import { VehicleType } from "./src/models/VehicleType.js";

dotenv.config();

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/musafirbaba");
    console.log("Connected to DB");

    const vehicles = await Vehicle.find();
    let migratedCount = 0;
    
    const existingBrands = new Set();
    const existingTypes = new Set();

    for (const vehicle of vehicles) {
      if (vehicle.vehicleBrand) existingBrands.add(vehicle.vehicleBrand.toLowerCase());
      if (vehicle.vehicleType) existingTypes.add(vehicle.vehicleType.toLowerCase());

      if (vehicle.location) {
        let oldDest;
        try {
           oldDest = await Destination.findById(vehicle.location);
        } catch(e) { /* might not be an object id or already migrated */ }
        
        if (oldDest && oldDest.name) {
          let newDest = await VehiclePickUpDestination.findOne({ name: oldDest.name });
          if (!newDest) {
            newDest = await VehiclePickUpDestination.create({
              name: oldDest.name,
              city: oldDest.city || "",
              state: oldDest.state || "",
              status: "active",
            });
          }
          vehicle.location = newDest._id;
          await vehicle.save();
          migratedCount++;
        }
      }
    }

    // Seed Brands
    for (const b of existingBrands) {
      if (!(await VehicleBrand.findOne({ name: b }))) {
        await VehicleBrand.create({ name: b });
      }
    }
    
    // Seed Types
    for (const t of existingTypes) {
      if (!(await VehicleType.findOne({ name: t }))) {
        await VehicleType.create({ name: t });
      }
    }

    console.log(`Migrated ${migratedCount} vehicles to new destination structure.`);
    console.log(`Brands seeded: ${[...existingBrands].join(", ")}`);
    console.log(`Types seeded: ${[...existingTypes].join(", ")}`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
