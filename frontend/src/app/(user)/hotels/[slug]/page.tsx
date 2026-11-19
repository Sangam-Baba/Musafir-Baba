// /hotels/[slug] — a hotel's page: rendered on the server (photos, description, amenities, rooms, policies, map
// address) for visitors and search engines; the rooms with live prices load in the browser for the chosen dates.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { B2B_API } from "@/b2b/api";
import { HotelContent, heroImage, type HotelContentData } from "@/b2b/website/HotelContent";
import { HOTELS_ENABLED, roomsFromParam } from "@/b2b/website/hotels";
import { HotelOffers } from "@/b2b/website/HotelOffers";

async function loadHotel(slug: string): Promise<HotelContentData | null> {
  if (!HOTELS_ENABLED || !/^[a-z0-9-]{3,100}$/i.test(slug)) return null;
  const res = await fetch(`${B2B_API}/hotels/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } }).catch(() => null);
  return res?.ok ? ((await res.json()) as HotelContentData) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const hotel = await loadHotel((await params).slug);
  if (!hotel) return { title: "Hotel | MusafirBaba" };
  const place = [hotel.address.area, hotel.address.city].filter(Boolean).join(", ");
  const image = heroImage(hotel);
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
  return <HotelContent hotel={hotel} rooms={<HotelOffers refOrSlug={hotel.publicRef} initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, rooms: roomsFromParam(sp.rooms ?? null) }} />} />;
}
