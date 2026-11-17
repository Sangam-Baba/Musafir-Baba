"use client";
// One property: status and submit, then each wizard step, room types, photos and visibility.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { LocationForm } from "@/b2b/components/listing/LocationForm";
import { PhotosPanel } from "@/b2b/components/listing/PhotosPanel";
import { RoomTypesPanel } from "@/b2b/components/listing/RoomTypesPanel";
import { AmenitiesForm, BasicForm, ContactsForm, PoliciesForm, TimesForm } from "@/b2b/components/listing/SectionForms";
import { StatusPanel } from "@/b2b/components/listing/StatusPanel";
import { VisibilityPanel } from "@/b2b/components/listing/VisibilityPanel";
import { EDITABLE, SECTION_LABEL, type Masters, type Property, type RoomType, type Section } from "@/b2b/listing";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

type Step = "status" | Section | "roomTypes" | "photos" | "visibility";
const STEPS: Step[] = ["status", "basic", "location", "contacts", "times", "policies", "amenities", "roomTypes", "photos", "visibility"];

export default function PropertyPage() {
  const params = useParams<{ id: string }>();
  return <BusinessShell>{(me) => <PropertyEditor id={params.id} me={me} />}</BusinessShell>;
}

function PropertyEditor({ id, me }: { id: string; me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("status");
  const key = ["b2b", "property", id, token];
  const property = useQuery({ queryKey: key, queryFn: () => b2b<Property>(`/hotel/properties/${id}`) });
  const rooms = useQuery({ queryKey: ["b2b", "rooms", id, token], queryFn: () => b2b<{ data: RoomType[] }>(`/hotel/properties/${id}/room-types`) });
  const masters = useQuery({ queryKey: ["b2b", "masters"], queryFn: () => b2b<Masters>("/catalog/masters"), staleTime: 300_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["b2b"] });
  const saved = (p: Property) => {
    queryClient.setQueryData(key, p);
    void queryClient.invalidateQueries({ queryKey: ["b2b", "listing-readiness", id] });
  };

  if (property.isLoading || masters.isLoading) return <p className="text-[13px] text-slate-500">Loading…</p>;
  if (!property.data || !masters.data) return <p className="text-[13px] text-red-700">{errorMessage(property.error ?? masters.error)}</p>;
  const p = property.data;
  const m = masters.data;
  const roomList = rooms.data?.data ?? [];
  const canManage = me.permissions.includes("hotel-catalog.property.manage") && !me.viewAs;
  const editable = canManage && EDITABLE.includes(p.status);
  const done = (s: Step) => (s in p.sections ? p.sections[s as Section] : s === "roomTypes" ? roomList.length > 0 : s === "photos" ? p.photoCounts.property >= 5 : null);
  const label = (s: Step) => (s === "status" ? "Status & submit" : s === "visibility" ? "Where it's sold" : SECTION_LABEL[s]);
  const props = { property: p, masters: m, disabled: !editable, onSaved: saved };

  return (
    <div className="space-y-4">
      <PageHeader
        crumb="My Properties"
        title={p.name}
        subtitle={`${p.publicRef} · edit each step, then submit for approval.`}
        actions={
          <Link href="/business/properties" className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] px-3 py-1.5 text-[13px] text-slate-700 hover:border-[#FE5300]">
            ← All properties
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {STEPS.map((s) => (
            <button key={s} onClick={() => setStep(s)} className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-[13px] ${step === s ? "bg-orange-50 font-medium text-[#FE5300]" : "text-slate-600 hover:bg-slate-100"}`}>
              {label(s)}
              {done(s) !== null && <span className={done(s) ? "text-green-600" : "text-slate-300"}>{done(s) ? "✓" : "○"}</span>}
            </button>
          ))}
        </nav>
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4">
          {step === "status" && <StatusPanel property={p} canManage={canManage} onChanged={saved} />}
          {step === "basic" && <BasicForm key={p.version} {...props} />}
          {step === "location" && <LocationForm key={p.version} {...props} />}
          {step === "contacts" && <ContactsForm key={p.version} {...props} />}
          {step === "times" && <TimesForm key={p.version} {...props} />}
          {step === "policies" && <PoliciesForm key={p.version} {...props} />}
          {step === "amenities" && <AmenitiesForm key={p.version} {...props} />}
          {step === "roomTypes" && <RoomTypesPanel propertyId={p.id} rooms={roomList} masters={m} editable={editable} onChanged={refresh} />}
          {step === "photos" && <PhotosPanel property={p} rooms={roomList} editable={editable} onChanged={refresh} />}
          {step === "visibility" && <VisibilityPanel key={p.version} property={p} editable={canManage && p.status !== "ARCHIVED"} onChanged={saved} />}
        </section>
      </div>
    </div>
  );
}
