import { RidePricingConfig, RIDE_PRICING_CONFIG_KEY } from "../models/RidePricingConfig.js";
import { normalizeCity, resolveCityKey } from "./cityFare.service.js";

// Which partners a ride's pickup reaches. One rule shared by the automatic
// broadcast, the partner app's Available tab, the admin eligible-partners
// list and the quote's eligible count.
//
// A partner city matches a pickup address when:
//   1. the city name appears in the address (the original rule -- every
//      match that worked before still works), OR
//   2. one part of the address is the same city: same name after removing
//      postal/direction words ("South Delhi" -> "delhi", "Delhi East
//      Division" -> "delhi"), or the same admin City group ("Delhi" and
//      "New Delhi", "Gurgaon" and "Gurugram").

// Words that don't change which city a place is in.
const NOISE_WORDS = new Set([
  "division", "gpo", "ho", "so", "head", "office", "district", "tehsil", "zone",
  "east", "west", "north", "south", "central", "city",
]);

// "Delhi East Division" -> "delhi"; "South West Delhi" -> "delhi"; "Mumbai Zone 3" -> "mumbai".
export function cleanPlaceName(name) {
  const words = normalizeCity(name)
    .split(" ")
    .filter((w) => w && !NOISE_WORDS.has(w) && !/^\d+$/.test(w));
  return words.join(" ");
}

const placeKey = (name, cityGroups) => {
  const exact = resolveCityKey(name, cityGroups);
  if (exact.startsWith("group:")) return exact;
  const cleaned = cleanPlaceName(name);
  return cleaned ? resolveCityKey(cleaned, cityGroups) : "";
};

export function makeLocationMatcher(cityGroups = []) {
  return (address, city) => {
    if (!address || !city) return false;
    if (String(address).toLowerCase().includes(String(city).toLowerCase())) return true;
    const target = placeKey(city, cityGroups);
    if (!target) return false;
    return String(address)
      .split(",")
      .some((part) => {
        const key = placeKey(part, cityGroups);
        return !!key && key === target;
      });
  };
}

// City groups come from the admin City rides settings (used even while city
// pricing itself is off -- they only say which names are the same city).
export async function getLocationMatcher() {
  const config = await RidePricingConfig.findOne({ key: RIDE_PRICING_CONFIG_KEY }).select("cityPricing.cityGroups").lean();
  return makeLocationMatcher(config?.cityPricing?.cityGroups || []);
}

// Cities the partner picked in the MBConnect app's Service Area screen
// (saved on the profile); they apply to all of the partner's vehicles.
export function partnerAppCities(profile) {
  return (profile?.pricingConfig?.locationsList || []).map((l) => l?.city).filter(Boolean);
}

// Cities a vehicle serves: its website duty locations + the partner's app Service Area.
export function vehicleServiceCities(vehicle, settings, profile) {
  const config = (settings?.vehicleConfigs || []).find((c) => String(c.vehicleId) === String(vehicle._id));
  const own = (config?.locations || []).map((l) => l?.city).filter(Boolean);
  return [...own, ...partnerAppCities(profile)];
}

export function vehicleServesAddress({ vehicle, settings, profile, address, match }) {
  return vehicleServiceCities(vehicle, settings, profile).some((city) => match(address, city));
}

// Admin "broadcast to selected partners": only those partners may see/accept.
export function isOfferedToPartner(ride, partnerId) {
  const list = ride?.broadcastPartnerIds || [];
  return !list.length || list.some((id) => String(id) === String(partnerId));
}
