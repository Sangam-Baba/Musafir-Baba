import { Vehicle } from "../models/Vehicle.js";
import { Destination } from "../models/Destination.js";
import { VehiclePickUpDestination } from "../models/VehiclePickUpDestination.js";
import { VehicleBrand } from "../models/VehicleBrand.js";
import { VehicleType } from "../models/VehicleType.js";

export const migrateLocations = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    let migratedCount = 0;
    
    // Create initial brands and types from existing data
    const existingBrands = new Set();
    const existingTypes = new Set();

    for (const vehicle of vehicles) {
      if (vehicle.vehicleBrand) existingBrands.add(vehicle.vehicleBrand.toLowerCase());
      if (vehicle.vehicleType) existingTypes.add(vehicle.vehicleType.toLowerCase());

      if (vehicle.location) {
        // Find old destination
        const oldDest = await Destination.findById(vehicle.location);
        if (oldDest) {
          // Check if it already exists in the new collection
          let newDest = await VehiclePickUpDestination.findOne({ name: oldDest.name });
          
          if (!newDest) {
            // Create new destination
            newDest = await VehiclePickUpDestination.create({
              name: oldDest.name,
              city: oldDest.city || "",
              state: oldDest.state || "",
              status: "active",
            });
          }
          
          // Update vehicle ref
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

    res.status(200).json({ 
      success: true, 
      message: `Migrated ${migratedCount} vehicles to new destination structure and seeded Brands/Types.`,
      brandsSeeded: [...existingBrands],
      typesSeeded: [...existingTypes]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Migration failed", error: error.message });
  }
};
