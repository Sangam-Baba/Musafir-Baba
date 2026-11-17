"use client";
// Location: city (and area), address, PIN and the map pin. The pin must be inside the chosen city — the server checks it.
// The map uses the Google Maps key the website already has; without it, latitude / longitude can be typed in.
import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

import type { Masters, Property } from "../../listing";

// The few Google Maps pieces used here (no extra type package needed).
type LatLng = { lat(): number; lng(): number };
type Point = { lat: number; lng: number };
interface MapsMarker {
  setPosition(p: Point | LatLng | null): void;
  getPosition(): LatLng | null | undefined;
  addListener(event: string, fn: () => void): void;
}
interface MapsMap {
  panTo(p: Point): void;
  addListener(event: string, fn: (e: { latLng: LatLng | null }) => void): void;
}
interface GoogleMapsLite {
  maps: { Map: new (el: HTMLElement, opts: Record<string, unknown>) => MapsMap; Marker: new (opts: Record<string, unknown>) => MapsMarker };
}
const googleMaps = () => (window as unknown as { google: GoogleMapsLite }).google;
import { inputCls, Labelled, SaveBar } from "./ui";
import { useSaveSection } from "./useSaveSection";

function MapPin({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const marker = useRef<MapsMarker | null>(null);
  const map = useRef<MapsMap | null>(null);
  const [failed, setFailed] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // the map is created once from the first position; later moves arrive through these refs
  const start = useRef({ lat, lng });
  const changed = useRef(onChange);
  changed.current = onChange;

  useEffect(() => {
    if (!key || !box.current || map.current) return;
    new Loader({ apiKey: key, version: "weekly" })
      .load()
      .then(() => {
        if (!box.current) return;
        const g = googleMaps();
        map.current = new g.maps.Map(box.current, { center: start.current, zoom: 15, streetViewControl: false, mapTypeControl: false });
        marker.current = new g.maps.Marker({ position: start.current, map: map.current, draggable: true });
        const move = (p: LatLng | null | undefined) => p && changed.current(Number(p.lat().toFixed(6)), Number(p.lng().toFixed(6)));
        marker.current.addListener("dragend", () => move(marker.current?.getPosition()));
        map.current.addListener("click", (e) => {
          marker.current?.setPosition(e.latLng);
          move(e.latLng);
        });
      })
      .catch(() => setFailed(true));
  }, [key]);

  useEffect(() => {
    marker.current?.setPosition({ lat, lng });
    map.current?.panTo({ lat, lng });
  }, [lat, lng]);

  if (!key || failed) return <p className="text-xs text-slate-500">The map isn't available here — type the latitude and longitude instead.</p>;
  return <div ref={box} className="h-72 w-full rounded-lg border border-slate-200" />;
}

export function LocationForm({ property, masters, disabled, onSaved }: { property: Property; masters: Masters; disabled: boolean; onSaved: (p: Property) => void }) {
  const { save, busy } = useSaveSection(property, onSaved);
  const firstCity = masters.cities.find((c) => c.id === property.cityId) ?? masters.cities[0];
  const [v, setV] = useState({
    cityId: property.cityId ?? firstCity?.id ?? "",
    areaId: property.areaId ?? "",
    line1: property.address.line1 ?? "",
    line2: property.address.line2 ?? "",
    pin: property.address.pin ?? "",
    lat: property.lat ?? firstCity?.lat ?? 20.5937,
    lng: property.lng ?? firstCity?.lng ?? 78.9629,
  });
  const city = masters.cities.find((c) => c.id === v.cityId);
  const pickCity = (id: string) => {
    const c = masters.cities.find((x) => x.id === id);
    setV({ ...v, cityId: id, areaId: "", ...(c ? { lat: c.lat, lng: c.lng } : {}) });
  };
  const body = { cityId: v.cityId, areaId: v.areaId || null, line1: v.line1, line2: v.line2.trim() || null, pin: v.pin, lat: v.lat, lng: v.lng };
  return (
    <form onSubmit={(e) => (e.preventDefault(), save("location", body))} className="grid gap-4 sm:grid-cols-2">
      <Labelled label="City">
        <select className={inputCls} value={v.cityId} onChange={(e) => pickCity(e.target.value)} disabled={disabled}>
          {masters.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Labelled>
      <Labelled label="Area (optional)">
        <select className={inputCls} value={v.areaId} onChange={(e) => setV({ ...v, areaId: e.target.value })} disabled={disabled || !city?.areas.length}>
          <option value="">—</option>
          {city?.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Labelled>
      <Labelled label="Address" wide>
        <input className={inputCls} value={v.line1} onChange={(e) => setV({ ...v, line1: e.target.value })} required minLength={3} disabled={disabled} />
      </Labelled>
      <Labelled label="Address line 2 (optional)">
        <input className={inputCls} value={v.line2} onChange={(e) => setV({ ...v, line2: e.target.value })} disabled={disabled} />
      </Labelled>
      <Labelled label="PIN code">
        <input className={inputCls} value={v.pin} onChange={(e) => setV({ ...v, pin: e.target.value })} required inputMode="numeric" disabled={disabled} />
      </Labelled>
      <div className="sm:col-span-2">
        <p className="mb-2 text-[13px] font-medium text-slate-700">Pin the exact location (drag the pin or click the map)</p>
        <MapPin lat={v.lat} lng={v.lng} onChange={(lat, lng) => setV((cur) => ({ ...cur, lat, lng }))} />
      </div>
      <Labelled label="Latitude">
        <input type="number" step="0.000001" className={inputCls} value={v.lat} onChange={(e) => setV({ ...v, lat: Number(e.target.value) })} disabled={disabled} />
      </Labelled>
      <Labelled label="Longitude">
        <input type="number" step="0.000001" className={inputCls} value={v.lng} onChange={(e) => setV({ ...v, lng: Number(e.target.value) })} disabled={disabled} />
      </Labelled>
      <div className="sm:col-span-2">
        <SaveBar busy={busy} disabled={disabled} note={property.status === "LIVE" ? "Location changes are checked by MusafirBaba first; the listing stays live." : `The pin must be within ${city?.radiusKm ?? "—"} km of ${city?.name ?? "the city"}.`} />
      </div>
    </form>
  );
}
