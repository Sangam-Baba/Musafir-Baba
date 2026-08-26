"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const INDIA_TOPO_URL = "/data/india-states.json";

export interface IndiaStateSpot {
  /** Must match the topojson's ST_NM property exactly */
  stateName: string;
  slug: string;
  label: string;
  coordinates: [number, number]; // [lng, lat]
  emoji: string;
}

// Same 6 states already used in DestinationSection.tsx's domestic list —
// duplicated here on purpose (small literal array) rather than importing
// from that file, so this new map stays fully isolated and DestinationSection
// stays completely untouched.
export const INDIA_SPOTS: IndiaStateSpot[] = [
  { stateName: "Himachal Pradesh", slug: "himachal-pradesh", label: "Himachal Pradesh", coordinates: [77.1734, 31.1048], emoji: "🏔️" },
  { stateName: "Uttarakhand", slug: "uttarakhand", label: "Uttarakhand", coordinates: [79.0193, 30.0668], emoji: "⛰️" },
  { stateName: "Rajasthan", slug: "rajasthan", label: "Rajasthan", coordinates: [74.2179, 27.0238], emoji: "🏰" },
  { stateName: "Kerala", slug: "kerala", label: "Kerala", coordinates: [76.2711, 10.8505], emoji: "🌴" },
  { stateName: "Goa", slug: "goa", label: "Goa", coordinates: [74.1240, 15.2993], emoji: "🏖️" },
  { stateName: "Jammu & Kashmir", slug: "jammu-and-kashmir", label: "Jammu & Kashmir", coordinates: [74.7973, 33.7782], emoji: "🗻" },
  { stateName: "Ladakh", slug: "ladakh", label: "Ladakh", coordinates: [77.5771, 34.1526], emoji: "🏔️" },
  { stateName: "Meghalaya", slug: "meghalaya", label: "Meghalaya", coordinates: [91.3662, 25.4670], emoji: "🌿" },
  { stateName: "Sikkim", slug: "sikkim", label: "Sikkim", coordinates: [88.5122, 27.5330], emoji: "🌸" },
  { stateName: "Karnataka", slug: "karnataka", label: "Karnataka", coordinates: [75.7139, 15.3173], emoji: "🏛️" },
  { stateName: "Maharashtra", slug: "maharashtra", label: "Maharashtra", coordinates: [75.7139, 19.7515], emoji: "🌊" },
  { stateName: "Gujarat", slug: "gujarat", label: "Gujarat", coordinates: [71.1924, 22.2587], emoji: "🦁" },
  { stateName: "Madhya Pradesh", slug: "madhya-pradesh", label: "Madhya Pradesh", coordinates: [78.6569, 22.9734], emoji: "🐯" },
  { stateName: "Uttar Pradesh", slug: "uttar-pradesh", label: "Uttar Pradesh", coordinates: [80.9462, 26.8467], emoji: "🛕" },
  { stateName: "Delhi", slug: "delhi", label: "Delhi", coordinates: [77.1025, 28.7041], emoji: "🕌" },
  { stateName: "Punjab", slug: "punjab", label: "Punjab", coordinates: [75.3412, 31.1471], emoji: "🌾" },
  { stateName: "Tamil Nadu", slug: "tamil-nadu", label: "Tamil Nadu", coordinates: [78.6569, 11.1271], emoji: "🛕" },
  { stateName: "West Bengal", slug: "west-bengal", label: "West Bengal", coordinates: [87.8550, 22.9868], emoji: "🐅" },
  { stateName: "Assam", slug: "assam", label: "Assam", coordinates: [92.9376, 26.2006], emoji: "🦏" },
  { stateName: "Arunachal Pradesh", slug: "arunachal-pradesh", label: "Arunachal Pradesh", coordinates: [94.7278, 28.2180], emoji: "🌄" },
  { stateName: "Nagaland", slug: "nagaland", label: "Nagaland", coordinates: [94.5624, 26.1584], emoji: "🪶" },
  { stateName: "Manipur", slug: "manipur", label: "Manipur", coordinates: [93.9063, 24.6637], emoji: "🌺" },
];

export default function IndiaStatesMap({
  activeSlug,
  onSpotHover,
}: {
  activeSlug?: string | null;
  onSpotHover?: (slug: string | null) => void;
}) {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [82, 22], scale: 580 }}
      width={360}
      height={400}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <filter id="india-pin-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="#1C2128" floodOpacity="0.28" />
        </filter>
      </defs>

      <Geographies geography={INDIA_TOPO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const matchedSpot = INDIA_SPOTS.find((s) => s.stateName === geo.properties.ST_NM);
            const isActive = !!matchedSpot && matchedSpot.slug === activeSlug;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={isActive ? "#FFD9C2" : "#EEF1F8"}
                stroke="#E1E4EE"
                strokeWidth={0.6}
                onMouseEnter={() => matchedSpot && onSpotHover?.(matchedSpot.slug)}
                onMouseLeave={() => matchedSpot && onSpotHover?.(null)}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: matchedSpot ? "#FFE3D1" : "#EEF1F8", cursor: matchedSpot ? "pointer" : "default" },
                  pressed: { outline: "none" },
                }}
              />
            );
          })
        }
      </Geographies>

      {INDIA_SPOTS.map((spot) => {
        const isActive = spot.slug === activeSlug;
        const r = isActive ? 12 : 10;
        return (
          <Marker
            key={spot.slug}
            coordinates={spot.coordinates}
            onMouseEnter={() => onSpotHover?.(spot.slug)}
            onMouseLeave={() => onSpotHover?.(null)}
            style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: { cursor: "pointer" } }}
          >
            <g filter="url(#india-pin-shadow)" transform={isActive ? "scale(1.12)" : "scale(1)"} style={{ transition: "transform 150ms ease" }}>
              <circle r={r} fill="#fff" stroke={isActive ? "#FE5300" : "#fff"} strokeWidth={isActive ? 2 : 0} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={r * 1.15} y={0.5}>
                {spot.emoji}
              </text>
            </g>
          </Marker>
        );
      })}
    </ComposableMap>
  );
}
