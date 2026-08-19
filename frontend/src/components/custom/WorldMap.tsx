"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const WORLD_TOPO_URL = "/data/world-countries-110m.json";

export interface WorldSpot {
  slug: string;
  label: string;
  coordinates: [number, number]; // [lng, lat]
  /** Flag or icon emoji shown inside the pin badge, e.g. "🇯🇵" */
  emoji?: string;
}

// Generic world-pin map shared by both the "World" destinations tab and the
// visa panel — the spot list (which countries, which slugs) is owned by
// whichever panel renders this, not by the map itself, so this component
// carries no editorial data of its own.
export default function WorldMap({
  spots,
  activeSlug,
  onSpotHover,
  center = [10, 8],
  scale = 118,
  width = 420,
  height = 260,
}: {
  spots: WorldSpot[];
  activeSlug?: string | null;
  onSpotHover?: (slug: string | null) => void;
  center?: [number, number];
  scale?: number;
  width?: number;
  height?: number;
}) {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center, scale }}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <filter id="world-pin-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="#1C2128" floodOpacity="0.28" />
        </filter>
      </defs>

      <Geographies geography={WORLD_TOPO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill="#EEF1F8"
              stroke="#E1E4EE"
              strokeWidth={0.5}
              style={{
                default: { outline: "none" },
                hover: { outline: "none" },
                pressed: { outline: "none" },
              }}
            />
          ))
        }
      </Geographies>

      {spots.map((spot) => {
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
            <g filter="url(#world-pin-shadow)" style={{ transition: "transform 150ms ease" }} transform={isActive ? "scale(1.12)" : "scale(1)"}>
              <circle r={r} fill="#fff" stroke={isActive ? "#FE5300" : "#fff"} strokeWidth={isActive ? 2 : 0} />
              {spot.emoji ? (
                <text textAnchor="middle" dominantBaseline="central" fontSize={r * 1.15} y={0.5}>
                  {spot.emoji}
                </text>
              ) : (
                <circle r={r * 0.4} fill={isActive ? "#FE5300" : "#3457C4"} />
              )}
            </g>
          </Marker>
        );
      })}
    </ComposableMap>
  );
}
