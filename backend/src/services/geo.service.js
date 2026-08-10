// Geo helpers used for ride distance & fare estimation. Kept behind one
// exported function (getRouteDistanceKm) so the provider can be swapped
// for a different one later without touching any calling code.
//
// Geocoding/search uses LocationIQ (Nominatim-compatible response shape --
// same display_name/lat/lon fields) instead of the free public Nominatim
// instance, since Nominatim rate-limits/blocks requests from shared cloud
// hosting IPs like Render's, which broke this in production.
const LOCATIONIQ_SEARCH_URL = "https://us1.locationiq.com/v1/search";
const LOCATIONIQ_REVERSE_URL = "https://us1.locationiq.com/v1/reverse";
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const USER_AGENT = "MusafirBaba-MBGO/1.0 (contact: support@musafirbaba.com)";

// Straight-line distance between two lat/lng points, in km.
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// Straight-line distance under-estimates real road distance; apply a
// correction factor as the fallback when routing services are unreachable.
const ROAD_DISTANCE_CORRECTION_FACTOR = 1.3;

/**
 * Geocode a free-text address into { lat, lng } using LocationIQ.
 * Returns null if it can't be resolved.
 */
export async function geocodeAddress(address) {
  try {
    const url = `${LOCATIONIQ_SEARCH_URL}?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch (error) {
    console.error("geocodeAddress error:", error.message);
    return null;
  }
}

/**
 * Free-text address search (autocomplete) using LocationIQ. Returns up to 8
 * suggestions with a display label + coordinates. Used to power the
 * pick-up/drop search boxes.
 */
export async function searchAddressSuggestions(query) {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `${LOCATIONIQ_SEARCH_URL}?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=in&addressdetails=0`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return [];
    const results = await response.json();
    if (!Array.isArray(results)) return [];
    return results.map((r) => ({
      address: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch (error) {
    console.error("searchAddressSuggestions error:", error.message);
    return [];
  }
}

/**
 * Reverse-geocode a lat/lng (e.g. from device GPS) into a display address,
 * for the "use my current location" button.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `${LOCATIONIQ_REVERSE_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (!result || !result.display_name) return null;
    return { address: result.display_name, lat, lng };
  } catch (error) {
    console.error("reverseGeocode error:", error.message);
    return null;
  }
}

/**
 * Road distance (km) + duration (minutes) between two coordinates via OSRM's
 * free public routing server. Returns null if unreachable.
 */
async function getOsrmRoute(pickupCoords, dropCoords) {
  try {
    const url = `${OSRM_URL}/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=false`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (error) {
    console.error("getOsrmRoute error:", error.message);
    return null;
  }
}

/**
 * Resolve pickup/drop addresses (or coordinates, if already known) into a
 * road distance in km + duration in minutes. Falls back to a corrected
 * straight-line estimate if geocoding/routing services are unavailable.
 *
 * @param {{address: string, lat?: number, lng?: number}} pickup
 * @param {{address: string, lat?: number, lng?: number}} drop
 */
export async function getRouteDistance(pickup, drop) {
  let pickupCoords = pickup.lat && pickup.lng ? { lat: pickup.lat, lng: pickup.lng } : await geocodeAddress(pickup.address);
  let dropCoords = drop.lat && drop.lng ? { lat: drop.lat, lng: drop.lng } : await geocodeAddress(drop.address);

  if (!pickupCoords || !dropCoords) {
    throw new Error("Could not resolve pickup/drop location. Please enter a more specific address.");
  }

  const osrmRoute = await getOsrmRoute(pickupCoords, dropCoords);
  if (osrmRoute) {
    return {
      distanceKm: Math.round(osrmRoute.distanceKm * 10) / 10,
      durationMin: Math.round(osrmRoute.durationMin),
      pickupCoords,
      dropCoords,
      source: "osrm",
    };
  }

  // Fallback: straight-line distance with a road-distance correction factor.
  const straightLineKm = haversineKm(pickupCoords, dropCoords);
  const estimatedKm = straightLineKm * ROAD_DISTANCE_CORRECTION_FACTOR;
  return {
    distanceKm: Math.round(estimatedKm * 10) / 10,
    durationMin: Math.round((estimatedKm / 40) * 60), // assume ~40km/h average
    pickupCoords,
    dropCoords,
    source: "haversine-fallback",
  };
}
