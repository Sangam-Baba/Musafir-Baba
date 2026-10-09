// Initial "City rides" rate card + city groups (from the business pricing
// table). Used as the pre-filled values in Admin -> Ride Pricing until an
// admin saves the City rides section; after that the saved values are used.

export const DEFAULT_CITY_RATE_CARD = [
  { name: "Go Hatchback", capacityLabel: "4+1", seatingCapacity: 4, partnerCategory: "Hatchback", basePrice: 49, perKmRate: 11, minBillableKm: 20, freeWaitingMin: 15, waitingChargePerMin: 2 },
  { name: "Comfort Sedan", capacityLabel: "4+1", seatingCapacity: 4, partnerCategory: "Sedan", basePrice: 59, perKmRate: 13, minBillableKm: 20, freeWaitingMin: 15, waitingChargePerMin: 2 },
  { name: "XL 7-Seater", capacityLabel: "6/7+1", seatingCapacity: 7, partnerCategory: "SUV", basePrice: 79, perKmRate: 16, minBillableKm: 20, freeWaitingMin: 15, waitingChargePerMin: 3 },
  { name: "SUV", capacityLabel: "6/7+1", seatingCapacity: 7, partnerCategory: "SUV", basePrice: 99, perKmRate: 20, minBillableKm: 20, freeWaitingMin: 15, waitingChargePerMin: 3 },
  { name: "Premium SUV", capacityLabel: "6/7+1", seatingCapacity: 7, partnerCategory: "SUV", basePrice: 129, perKmRate: 24, minBillableKm: 20, freeWaitingMin: 15, waitingChargePerMin: 4 },
].map((vehicle, index) => ({ ...vehicle, isActive: true, sortOrder: index + 1 }));

export const DEFAULT_CITY_GROUPS = [
  { name: "Delhi", aliases: ["Delhi", "New Delhi"] },
  { name: "Gurugram", aliases: ["Gurugram", "Gurgaon"] },
  { name: "Noida", aliases: ["Noida", "Greater Noida"] },
  { name: "Mumbai", aliases: ["Mumbai", "Bombay"] },
  { name: "Bengaluru", aliases: ["Bengaluru", "Bangalore"] },
];

export function defaultCityPricing() {
  return { enabled: false, vehicleTypes: DEFAULT_CITY_RATE_CARD, cityGroups: DEFAULT_CITY_GROUPS };
}
