"use client";
// A hotel in the B2B dashboard: its content, and rooms with this client's B2B price, GST lines, total and selling price.
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { b2b } from "@/b2b/api";
import { businessCall, businessStreamToken } from "@/b2b/client-search";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { BookNow } from "@/b2b/components/client/BookNow";
import { RequestBooking } from "@/b2b/components/client/RequestBooking";
import { errorMessage } from "@/b2b/messages";
import { HotelContent, type HotelContentData } from "@/b2b/website/HotelContent";
import { BOOKING_ENABLED } from "@/b2b/website/checkout";
import { roomsFromParam } from "@/b2b/website/hotels";
import { HotelOffers } from "@/b2b/website/HotelOffers";

function Hotel({ slug, canRequest, canBook }: { slug: string; canRequest: boolean; canBook: boolean }) {
  const sp = useSearchParams();
  const hotel = useQuery({ queryKey: ["b2b", "hotel", slug], queryFn: () => b2b<HotelContentData>(`/hotels/${encodeURIComponent(slug)}`), retry: false });
  if (hotel.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!hotel.data) return <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{errorMessage(hotel.error)}</p>;
  const initial = { checkIn: sp.get("checkIn") ?? undefined, checkOut: sp.get("checkOut") ?? undefined, rooms: roomsFromParam(sp.get("rooms")) };
  return (
    <div className="space-y-3">
      <Link href="/business/hotels" className="inline-flex items-center gap-1 text-[13px] text-slate-600 hover:text-[#FE5300]">
        <ArrowLeft size={14} /> Back to search
      </Link>
      <HotelContent hotel={hotel.data} className="space-y-6" rooms={<HotelOffers refOrSlug={hotel.data.publicRef} initial={initial} call={businessCall} getToken={businessStreamToken} b2b action={canRequest || canBook ? (o) => <>{canBook && <BookNow offer={o} />}{canRequest && <RequestBooking offer={o} />}</> : undefined} />} />
    </div>
  );
}

export default function ClientHotelPage() {
  const params = useParams<{ slug: string }>();
  return <BusinessShell>{(me) => (me.permissions.includes("hotel-search.search.use") ? (
          <Suspense>
            <Hotel slug={params.slug} canRequest={me.permissions.includes("hotel-booking.request.create") && !me.viewAs} canBook={BOOKING_ENABLED && me.permissions.includes("orders.order.create") && !me.viewAs} />
          </Suspense>
        ) : <p className="text-[13px] text-slate-600">Hotel search is for verified B2B client companies.</p>)}</BusinessShell>;
}
