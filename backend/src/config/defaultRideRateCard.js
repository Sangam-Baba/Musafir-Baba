// Initial MBGo rate card (from the business pricing sheet), used only by
// scripts/seedRidePricingConfig.js to create the RidePricingConfig document
// the first time. After that, admins edit the values in the database --
// changing this file does not affect an already-seeded config.

export const DEFAULT_RIDE_RATE_CARD = [
  { name: "Hatchback", capacityLabel: "4+1", seatingCapacity: 4, partnerCategory: "Hatchback", oneWayRate: 12, roundTripRate: 11.5, minKmPerDay: 250, extraKmRate: 12 },
  { name: "Sedan", capacityLabel: "4+1", seatingCapacity: 4, partnerCategory: "Sedan", oneWayRate: 14, roundTripRate: 13.5, minKmPerDay: 250, extraKmRate: 14 },
  { name: "Rumion / Ertiga", capacityLabel: "6+1", seatingCapacity: 6, partnerCategory: "SUV", oneWayRate: 17, roundTripRate: 16.5, minKmPerDay: 250, extraKmRate: 17 },
  { name: "Carens / XL MUV", capacityLabel: "6+1", seatingCapacity: 6, partnerCategory: "SUV", oneWayRate: 19, roundTripRate: 18, minKmPerDay: 250, extraKmRate: 19 },
  { name: "SUV", capacityLabel: "6/7+1", seatingCapacity: 7, partnerCategory: "SUV", oneWayRate: 22, roundTripRate: 21, minKmPerDay: 250, extraKmRate: 22 },
  { name: "Premium SUV", capacityLabel: "6/7+1", seatingCapacity: 7, partnerCategory: "SUV", oneWayRate: 25, roundTripRate: 24, minKmPerDay: 250, extraKmRate: 25 },
  { name: "Tempo Traveller 12 Seater", capacityLabel: "12+1", seatingCapacity: 12, partnerCategory: "Tempo Traveller", oneWayRate: 28, roundTripRate: 27, minKmPerDay: 250, extraKmRate: 28 },
  { name: "Tempo Traveller 16 Seater", capacityLabel: "16+1", seatingCapacity: 16, partnerCategory: "Tempo Traveller", oneWayRate: 32, roundTripRate: 30, minKmPerDay: 250, extraKmRate: 32 },
  { name: "Tempo Traveller 20 Seater", capacityLabel: "20+1", seatingCapacity: 20, partnerCategory: "Tempo Traveller", oneWayRate: 36, roundTripRate: 34, minKmPerDay: 250, extraKmRate: 36 },
  { name: "Tempo Traveller 26 Seater", capacityLabel: "26+1", seatingCapacity: 26, partnerCategory: "Tempo Traveller", oneWayRate: 42, roundTripRate: 40, minKmPerDay: 250, extraKmRate: 42 },
].map((vehicle, index) => ({ ...vehicle, isActive: true, sortOrder: index + 1 }));
