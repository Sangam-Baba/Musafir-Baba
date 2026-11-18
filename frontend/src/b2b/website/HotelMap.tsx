"use client";
// Results on a map (Google Maps, the website's existing key): one price pin per hotel. Without a key the map is hidden.
import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

import { inr, type SearchItem } from "./hotels";

type MapsLite = {
  maps: {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => { fitBounds(b: unknown): void; setCenter(p: unknown): void; setZoom(z: number): void };
    Marker: new (opts: Record<string, unknown>) => { addListener(e: string, fn: () => void): void; setMap(m: unknown): void };
    LatLngBounds: new () => { extend(p: { lat: number; lng: number }): void };
  };
};

export function HotelMap({ items, onPick }: { items: SearchItem[]; onPick: (slug: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const pinned = items.filter((i) => i.location && i.from);

  useEffect(() => {
    if (!key || !box.current || pinned.length === 0) return;
    let markers: { setMap(m: unknown): void }[] = [];
    new Loader({ apiKey: key, version: "weekly" })
      .load()
      .then(() => {
        if (!box.current) return;
        const g = (window as unknown as { google: MapsLite }).google;
        const map = new g.maps.Map(box.current, { streetViewControl: false, mapTypeControl: false, fullscreenControl: false });
        const bounds = new g.maps.LatLngBounds();
        markers = pinned.map((i) => {
          const pos = i.location as { lat: number; lng: number };
          bounds.extend(pos);
          const m = new g.maps.Marker({ position: pos, map, label: { text: inr(i.from?.perNightPaise ?? 0), fontSize: "11px", fontWeight: "600" }, title: i.name });
          m.addListener("click", () => onPick(i.slug));
          return m;
        });
        if (pinned.length === 1) {
          map.setCenter(pinned[0]?.location);
          map.setZoom(14);
        } else map.fitBounds(bounds);
      })
      .catch(() => setFailed(true));
    return () => markers.forEach((m) => m.setMap(null));
  }, [key, pinned, onPick]);

  if (!key || failed || pinned.length === 0) return null;
  return <div ref={box} className="h-80 w-full rounded-xl border border-slate-200 lg:sticky lg:top-24 lg:h-[70vh]" />;
}
