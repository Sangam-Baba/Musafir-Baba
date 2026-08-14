const LOCATIONIQ_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY;
const BASE_URL = 'https://maps.locationiq.com/v3/staticmap';

type Coords = { lat: number; lng: number };

// Builds a small static-map image URL for the trip-status modal. Stage
// controls which pins/route are drawn, mirroring the design mockup:
//  - locked: pickup pin only (rider identity is gated, not the pickup point
//    itself, which partners already see pre-accept)
//  - enroute / arrived: pickup pin + the partner's current position
//  - ongoing: pickup + drop pins with a route line between them
export function buildTripMapUrl(
  stage: 'locked' | 'enroute' | 'arrived' | 'ongoing',
  pickup: Coords,
  drop?: Coords,
  partnerLocation?: Coords
): string | null {
  if (!LOCATIONIQ_KEY || !pickup?.lat || !pickup?.lng) return null;

  const markers = [`icon:large-green-cutout|${pickup.lat},${pickup.lng}`];
  const params = new URLSearchParams({
    key: LOCATIONIQ_KEY,
    size: '600x300',
    format: 'png',
  });

  if (stage === 'ongoing' && drop?.lat && drop?.lng) {
    markers.push(`icon:large-red-cutout|${drop.lat},${drop.lng}`);
    params.set('path', `color:0xfe5300|weight:4|${pickup.lat},${pickup.lng}|${drop.lat},${drop.lng}`);
  } else if ((stage === 'enroute' || stage === 'arrived') && partnerLocation?.lat && partnerLocation?.lng) {
    markers.push(`icon:large-blue-cutout|${partnerLocation.lat},${partnerLocation.lng}`);
  } else if (stage === 'locked') {
    params.set('center', `${pickup.lat},${pickup.lng}`);
    params.set('zoom', '13');
  }

  markers.forEach((m) => params.append('markers', m));

  return `${BASE_URL}?${params.toString()}`;
}

const EARTH_RADIUS_KM = 6371;
export function distanceKm(a: Coords, b: Coords): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
