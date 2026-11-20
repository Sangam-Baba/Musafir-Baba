"use client";
// Booking requests (B2B dashboard, D37): what the team asked MusafirBaba to arrange, and where each one stands.
// Agents limited to their own work see only theirs. An open request can be cancelled.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { REQUEST_STATUS_LABEL, type BookingRequest, type RequestStatus } from "@/b2b/booking-requests";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import type { Me } from "@/b2b/types";
import { inr } from "@/b2b/website/hotels";

const TONE: Record<RequestStatus, string> = {
  SUBMITTED: "bg-sky-50 text-sky-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};
const FILTERS: (RequestStatus | "")[] = ["", "SUBMITTED", "IN_PROGRESS", "CONFIRMED", "DECLINED", "CANCELLED"];
const guests = (r: BookingRequest) => r.stay.occupancies.reduce((n, o) => n + o.adults + o.children, 0);

function Row({ r, canCancel }: { r: BookingRequest; canCancel: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  async function cancel() {
    try {
      await b2b(`/booking-requests/${r.id}/cancel`, { method: "POST", body: {}, headers: { "If-Match": `"${r.version}"` } });
      toast.success("Request cancelled");
      void queryClient.invalidateQueries({ queryKey: ["b2b", "booking-requests"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button type="button" onClick={() => setOpen(!open)} className="grid w-full grid-cols-2 gap-2 px-4 py-3 text-left text-[13px] hover:bg-slate-50 sm:grid-cols-[8rem_1fr_9rem_7rem_8rem]">
        <span className="font-mono text-[12px] text-slate-600">{r.ref}</span>
        <span className="text-slate-900">{r.stay.propertyName}<span className="block text-xs text-slate-500">{r.customer.name}{r.customer.reference ? ` · ${r.customer.reference}` : ""}</span></span>
        <span className="text-slate-600">{r.stay.checkIn} → {r.stay.checkOut}</span>
        <span className="text-slate-800">{inr(r.quoted.totalPaise)}</span>
        <span><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span></span>
      </button>
      {open && (
        <div className="space-y-2 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
          <p>{r.stay.roomTypeName} · {r.stay.planName} · {r.stay.occupancies.length} room{r.stay.occupancies.length > 1 ? "s" : ""}, {guests(r)} guest{guests(r) > 1 ? "s" : ""}{r.stay.city ? ` · ${r.stay.city}` : ""}</p>
          {r.customer.guestNames.length > 0 && <p>Guests: {r.customer.guestNames.join(", ")}</p>}
          {r.notes && <p>Notes: {r.notes}</p>}
          {r.hotelConfirmation && <p className="font-medium text-emerald-700">Hotel confirmation: {r.hotelConfirmation}</p>}
          {r.decisionNote && <p>MusafirBaba: {r.decisionNote}</p>}
          <ol className="space-y-0.5 border-l border-slate-200 pl-3 text-xs text-slate-500">
            {r.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} · {REQUEST_STATUS_LABEL[h.status as RequestStatus] ?? h.status}{h.note ? ` — ${h.note}` : ""}</li>)}
          </ol>
          {canCancel && (r.status === "SUBMITTED" || r.status === "IN_PROGRESS") && (
            <button type="button" onClick={cancel} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-600">Cancel request</button>
          )}
        </div>
      )}
    </div>
  );
}

function Requests({ me }: { me: Me }) {
  const [status, setStatus] = useState<RequestStatus | "">("");
  const list = useQuery({ queryKey: ["b2b", "booking-requests", me.currentOrgId, status], queryFn: () => b2b<{ data: BookingRequest[] }>(`/booking-requests${status ? `?status=${status}` : ""}`) });
  const canCancel = me.permissions.includes("hotel-booking.request.create") && !me.viewAs;
  return (
    <div className="space-y-4">
      <PageHeader title="Booking" highlight="requests" subtitle="Rooms you asked MusafirBaba to arrange for your customers. Online booking with instant confirmation is coming." />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f || "all"} onClick={() => setStatus(f)} className={`rounded-full border px-3 py-1 text-[12px] ${status === f ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>{f ? REQUEST_STATUS_LABEL[f] : "All"}</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list.isLoading && <p className="p-6 text-center text-[13px] text-slate-500">Loading…</p>}
        {list.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(list.error)}</p>}
        {list.data?.data.length === 0 && (
          <p className="p-8 text-center text-[13px] text-slate-600">No requests yet. <Link href="/business/hotels" className="text-[#FE5300] hover:underline">Search hotels</Link> and use “Request booking” on a room.</p>
        )}
        {list.data?.data.map((r) => <Row key={r.id} r={r} canCancel={canCancel} />)}
      </div>
    </div>
  );
}

export default function BookingRequestsPage() {
  return <BusinessShell>{(me) => (me.permissions.includes("hotel-booking.request.read") ? <Requests me={me} /> : <p className="text-[13px] text-slate-600">This page is for B2B client companies.</p>)}</BusinessShell>;
}
