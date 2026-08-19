import VisaMadeEasyPanel, { type VisaDurations } from "./VisaMadeEasyPanel";

export interface VisaSpot {
  country: string;
  slug: string;
  coordinates: [number, number]; // [lng, lat]
  emoji: string;
  /** Pre-computed position (% of the map container) matching MAP_CENTER/MAP_SCALE
   *  below, so the floating card can anchor itself to the pin without needing
   *  a runtime d3-geo projection call. Recompute these if MAP_CENTER/MAP_SCALE
   *  ever change. */
  xPercent: number;
  yPercent: number;
}

// Center/scale the map is rendered with (VisaMadeEasyPanel.tsx passes these
// to WorldMap) — chosen so all 12 pins below actually fit inside the canvas
// with margin. The previous defaults (center [10,8], scale 118) clipped
// Canada, the UK and New Zealand off the edges.
export const MAP_CENTER: [number, number] = [25, 10];
export const MAP_SCALE = 80;
export const MAP_WIDTH = 460;
export const MAP_HEIGHT = 320;

// Same finalVisa country list VisaHome.tsx curates (see VISA_METADATA /
// finalVisa in that file) — duplicated here as a small literal array so this
// new panel stays isolated and VisaHome.tsx stays untouched. Slugs match the
// real backend-driven slugs already verified live (see navLinks.ts).
export const VISA_SPOTS: VisaSpot[] = [
  { country: "UAE", slug: "uae-visa", coordinates: [55.2708, 25.2048], emoji: "🇦🇪", xPercent: 59.2, yPercent: 43.1 },
  { country: "Schengen", slug: "schengen-visa", coordinates: [10.4515, 51.1657], emoji: "🇪🇺", xPercent: 45.6, yPercent: 28.2 },
  { country: "USA", slug: "us-visa", coordinates: [-95.7129, 37.0902], emoji: "🇺🇸", xPercent: 13.4, yPercent: 37.0 },
  { country: "UK", slug: "uk-visa", coordinates: [-3.436, 55.3781], emoji: "🇬🇧", xPercent: 41.4, yPercent: 25.3 },
  { country: "Canada", slug: "canada-visa", coordinates: [-106.3468, 56.1304], emoji: "🇨🇦", xPercent: 10.1, yPercent: 24.5 },
  { country: "Singapore", slug: "singapore-visa", coordinates: [103.8198, 1.3521], emoji: "🇸🇬", xPercent: 73.9, yPercent: 53.8 },
  { country: "Australia", slug: "australia-visa", coordinates: [133.7751, -25.2744], emoji: "🇦🇺", xPercent: 83.0, yPercent: 65.8 },
  { country: "Japan", slug: "japan-visa", coordinates: [138.2529, 36.2048], emoji: "🇯🇵", xPercent: 84.4, yPercent: 37.4 },
  { country: "Vietnam", slug: "vietnam-visa", coordinates: [108.2772, 14.0583], emoji: "🇻🇳", xPercent: 75.3, yPercent: 48.2 },
  { country: "China", slug: "china-visa", coordinates: [104.1954, 35.8617], emoji: "🇨🇳", xPercent: 74.0, yPercent: 37.6 },
  { country: "New Zealand", slug: "new-zealand-visa", coordinates: [174.886, -40.9006], emoji: "🇳🇿", xPercent: 95.5, yPercent: 74.0 },
  { country: "Turkey", slug: "turkey-visa", coordinates: [35.2433, 38.9637], emoji: "🇹🇷", xPercent: 53.1, yPercent: 35.9 },
];

// Same fetch pattern as VisaHome.tsx's getVisa() — real, live data, just a
// simpler mapping (slug -> duration) since this panel only needs the
// processing-time figure, not the full visa record.
async function getDurations(): Promise<VisaDurations> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/?country=`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const durations: VisaDurations = {};
    for (const v of data?.data ?? []) {
      if (v.slug && v.duration) durations[v.slug] = v.duration;
    }
    return durations;
  } catch {
    return {};
  }
}

export default async function VisaMadeEasySection() {
  const durations = await getDurations();
  return <VisaMadeEasyPanel durations={durations} />;
}
