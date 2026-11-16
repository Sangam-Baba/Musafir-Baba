"use client";
// What the reviewer checks: the listing's details, its photos (open full size), room types, the automatic checklist
// and possible duplicates nearby.
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ListingDetail } from "../../../admin-listing";
import { BLOCKER_TEXT, type Masters } from "../../../listing";
import { FleetPanel, FleetPill, fleetTone } from "../kit";

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-[12px] text-slate-500">{k}</dt>
      <dd className="col-span-2 text-[13px] text-slate-900">{children}</dd>
    </div>
  );
}

export function ListingChecklist({ detail }: { detail: ListingDetail }) {
  const { blockers, duplicates } = detail.checklist;
  return (
    <FleetPanel title="Checklist" description="Checked automatically — also look at photo quality and the pin yourself." bodyClassName="space-y-2 p-4 text-[13px]">
      {blockers.length === 0 ? (
        <p className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Complete: every step, room types, photos, GSTIN for the state
        </p>
      ) : (
        blockers.map((b, i) => (
          <p key={i} className="flex items-center gap-1.5 text-amber-700">
            <AlertTriangle className="h-4 w-4" /> {BLOCKER_TEXT[b.code]?.(b.detail) ?? b.code}
          </p>
        ))
      )}
      {duplicates.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="font-medium text-red-700">Possible duplicates within 200 m</p>
          {duplicates.map((d) => (
            <p key={d.id} className="mt-1">
              <Link href={`/admin/b2b/properties/${d.id}`} className="text-red-800 underline">
                {d.name}
              </Link>{" "}
              · {d.publicRef} · {d.status.toLowerCase()} · {d.distanceM} m away{d.sameOrganisation ? " · same company" : ""}
            </p>
          ))}
        </div>
      )}
    </FleetPanel>
  );
}

export function ListingFacts({ detail, masters }: { detail: ListingDetail; masters: Masters | undefined }) {
  const p = detail.property;
  const city = masters?.cities.find((c) => c.id === p.cityId);
  const amenity = (k: string) => masters?.amenities.find((a) => a.key === k)?.name ?? k;
  const bed = (k: string) => masters?.bedTypes.find((b) => b.key === k)?.name ?? k;
  return (
    <>
      <FleetPanel title="Details" bodyClassName="p-4">
        <dl>
          <Row k="Name">{p.name}</Row>
          <Row k="Type · stars">
            {masters?.propertyTypes.find((t) => t.key === p.propertyTypeKey)?.name ?? p.propertyTypeKey} · {p.starRating ? `${p.starRating} star` : "not rated"}
          </Row>
          <Row k="Company">{detail.organisation ? `${detail.organisation.name} (${detail.organisation.status.toLowerCase()})` : "—"}</Row>
          <Row k="Address">
            {[p.address.line1, p.address.line2, city?.name, p.address.pin].filter(Boolean).join(", ") || "—"}
            {p.lat !== null && p.lng !== null && (
              <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-[#FE5300]">
                map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </Row>
          <Row k="GSTIN">{p.gstin ?? (p.gstinMissing ? <span className="text-amber-700">missing for this state</span> : "not GST-registered")}</Row>
          <Row k="Contacts">{[p.contacts.email, p.contacts.phone, p.contacts.whatsapp].filter(Boolean).join(" · ") || "—"}</Row>
          <Row k="Check-in / out">
            {p.checkInTime ?? "—"} / {p.checkOutTime ?? "—"} · {p.timeZone}
          </Row>
          <Row k="Amenities">{p.amenities.map(amenity).join(", ") || "—"}</Row>
          <Row k="Description">
            <span className="whitespace-pre-line">{p.description || "—"}</span>
          </Row>
        </dl>
      </FleetPanel>
      <FleetPanel title="Room types" bodyClassName="divide-y divide-slate-100">
        {detail.roomTypes.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-4 py-2 text-[13px]">
            <span className="flex-1 font-medium text-slate-900">{r.name}</span>
            <span className="text-slate-500">
              {r.beds.map((b) => `${b.count} × ${bed(b.bedTypeKey)}`).join(", ")} · up to {r.maxOccupancy}
            </span>
            {r.status !== "ACTIVE" && <FleetPill className={fleetTone.slate}>{r.status.toLowerCase()}</FleetPill>}
          </div>
        ))}
      </FleetPanel>
      <FleetPanel title="Photos" description="Click to open full size." bodyClassName="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
        {p.photos.map((ph) => (
          <a key={ph.id} href={(ph.sizes.hero ?? ph.sizes.gallery)?.url} target="_blank" rel="noreferrer" className="relative block">
            <Image unoptimized src={(ph.sizes.thumb ?? ph.sizes.card)?.url ?? ""} width={320} height={200} alt={ph.caption ?? ph.category} className="aspect-[4/3] w-full rounded object-cover" />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
              {ph.isCover ? "★ " : ""}
              {ph.roomTypeId ? (detail.roomTypes.find((r) => r.id === ph.roomTypeId)?.name ?? "room") : ph.category.toLowerCase()}
            </span>
          </a>
        ))}
      </FleetPanel>
    </>
  );
}
