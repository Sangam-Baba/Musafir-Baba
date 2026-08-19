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
  { stateName: "Rajasthan", slug: "rajasthan", label: "Rajasthan", coordinates: [74.2179, 27.0238], emoji: "🏜️" },
  { stateName: "Kerala", slug: "kerala", label: "Kerala", coordinates: [76.2711, 10.8505], emoji: "🌴" },
  { stateName: "Meghalaya", slug: "meghalaya", label: "Meghalaya", coordinates: [91.3662, 25.4670], emoji: "🌿" },
  { stateName: "Jammu & Kashmir", slug: "jammu-and-kashmir", label: "Jammu & Kashmir", coordinates: [76.5762, 33.7782], emoji: "🗻" },
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
