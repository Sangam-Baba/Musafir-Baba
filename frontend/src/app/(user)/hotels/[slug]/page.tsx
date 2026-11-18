// /hotels/[slug] — a hotel's page: rendered on the server (photos, description, amenities, rooms, policies, map
// address) for visitors and search engines; the rooms with live prices load in the browser for the chosen dates.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, MapPin, Star } from "lucide-react";

import { B2B_API } from "@/b2b/api";
import { HOTELS_ENABLED, roomsFromParam } from "@/b2b/website/hotels";
import { HotelOffers } from "@/b2b/website/HotelOffers";

type Size = { url: string; width: number; height: number };
type Photo = { category: string; caption: string | null; sizes: Record<string, Size> };
type Hotel = {
  publicRef: string;
  slug: string;
  name: string;
  type: { name: string };
  starRating: number;
  description: string;
  address: { line1: string | null; area: string | null; city: string | null; state: string | null; pin: string | null };
  checkInTime: string | null;
  checkOutTime: string | null;
  policies: { childrenAllowed: boolean; petsAllowed: boolean; coupleFriendly: boolean; localIdAccepted: boolean; smoking: string; notes: string | null } | null;
  amenities: { key: string; name: string; group: string }[];
  photos: Photo[];
  roomTypes: { id: string; name: string; description: string; sizeSqm: number | null; beds: { name: string; count: number }[]; maxOccupancy: number; amenities: { name: string }[]; photos: Photo[] }[];
};

async function loadHotel(slug: string): Promise<Hotel | null> {
  if (!HOTELS_ENABLED || !/^[a-z0-9-]{3,100}$/i.test(slug)) return null;
  const res = await fetch(`${B2B_API}/hotels/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } }).catch(() => null);
  return res?.ok ? ((await res.json()) as Hotel) : null;
}

const pic = (p: Photo | undefined, size: string) => p?.sizes[size]?.url ?? p?.sizes.gallery?.url ?? p?.sizes.card?.url ?? null;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const hotel = await loadHotel((await params).slug);
  if (!hotel) return { title: "Hotel | MusafirBaba" };
  const place = [hotel.address.area, hotel.address.city].filter(Boolean).join(", ");
  const image = pic(hotel.photos[0], "hero");
  return {
    title: `${hotel.name}${place ? `, ${place}` : ""} | MusafirBaba`,
    description: hotel.description.slice(0, 160),
    alternates: { canonical: `https://musafirbaba.com/hotels/${hotel.slug}` },
    openGraph: { title: hotel.name, description: hotel.description.slice(0, 160), images: image ? [{ url: image }] : [] },
  };
}

export default async function HotelPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const hotel = await loadHotel(slug);
  if (!hotel) notFound();
  const gallery = hotel.photos.slice(0, 5);
  const place = [hotel.address.line1, hotel.address.area, hotel.address.city, hotel.address.state, hotel.address.pin].filter(Boolean).join(", ");
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 pt-24 sm:pt-28">
      <header className="space-y-1">
        <p className="text-sm text-slate-500">{hotel.type.name}</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{hotel.name}</h1>
        {hotel.starRating > 0 && <div className="flex text-amber-500">{Array.from({ length: hotel.starRating }, (_, i) => <Star key={i} size={15} fill="currentColor" />)}</div>}
        <p className="flex items-center gap-1 text-sm text-slate-600"><MapPin size={14} /> {place}</p>
      </header>
      {gallery.length > 0 && (
        <div className="grid h-64 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:h-96">
          {gallery.map((p, i) => (
            <img key={i} src={pic(p, i === 0 ? "hero" : "card") ?? ""} alt={p.caption ?? hotel.name} className={`h-full w-full object-cover ${i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block"}`} loading={i === 0 ? "eager" : "lazy"} />
          ))}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">About</h2>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{hotel.description}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Rooms &amp; prices</h2>
            <HotelOffers refOrSlug={hotel.publicRef} initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, rooms: roomsFromParam(sp.rooms ?? null) }} />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Room types</h2>
            {hotel.roomTypes.map((r) => (
              <div key={r.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
                {pic(r.photos[0], "card") && <img src={pic(r.photos[0], "card") ?? ""} alt={r.name} className="h-24 w-32 shrink-0 rounded-lg object-cover" loading="lazy" />}
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-slate-600">{[r.sizeSqm ? `${r.sizeSqm} m²` : "", r.beds.map((b) => `${b.count} × ${b.name}`).join(", "), `up to ${r.maxOccupancy} guests`].filter(Boolean).join(" · ")}</p>
                  {r.amenities.length > 0 && <p className="text-xs text-slate-500">{r.amenities.map((a) => a.name).join(" · ")}</p>}
                </div>
              </div>
            ))}
          </section>
        </div>
        <aside className="space-y-4">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="flex items-center gap-2"><Clock size={14} /> Check-in {hotel.checkInTime ?? "—"} · Check-out {hotel.checkOutTime ?? "—"}</p>
            {hotel.policies && (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                <li>Children {hotel.policies.childrenAllowed ? "welcome" : "not allowed"}</li>
                <li>Pets {hotel.policies.petsAllowed ? "allowed" : "not allowed"}</li>
                {hotel.policies.coupleFriendly && <li>Couple friendly</li>}
                {hotel.policies.localIdAccepted && <li>Local ID accepted</li>}
                {hotel.policies.notes && <li>{hotel.policies.notes}</li>}
              </ul>
            )}
          </div>
          {hotel.amenities.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Amenities</h2>
              <ul className="grid grid-cols-2 gap-1 text-xs text-slate-600">{hotel.amenities.map((a) => <li key={a.key}>{a.name}</li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
