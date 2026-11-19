"use client";
// Booking requests (MusafirBaba admin, D37): B2B clients ask, the team arranges the stay offline (phone / email,
// payment outside the system) and records the outcome — take, confirm with the hotel's confirmation number, or decline
// with a reason. The client sees the status and gets an email. No rooms are taken here.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { REQUEST_STATUS_LABEL, type BookingRequest, type RequestStatus } from "../../booking-requests";
import { errorMessage } from "../../messages";
import { inr } from "../../website/hotels";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "./kit";

const TONE: Record<RequestStatus, string> = { SUBMITTED: fleetTone.sky, IN_PROGRESS: fleetTone.amber, CONFIRMED: fleetTone.emerald, DECLINED: fleetTone.red, CANCELLED: fleetTone.slate };
const FILTERS: (RequestStatus | "")[] = ["", "SUBMITTED", "IN_PROGRESS", "CONFIRMED", "DECLINED", "CANCELLED"];

function Detail({ r, token }: { r: BookingRequest; token: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(action: "take" | "confirm" | "decline") {
    setBusy(true);
    try {
      await adminCall(`/admin/booking-requests/${r.id}/${action}`, token, { method: "POST", body: { note: note.trim() || null, hotelConfirmation: conf.trim() || null }, headers: { "If-Match": `"${r.version}"` } });
      toast.success({ take: "Taken — you're handling it", confirm: "Confirmed — the client is told", decline: "Declined — the client is told why" }[action]);
      void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "booking-requests"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const s = r.stay;
  return (
    <div className="space-y-2 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
      <p><strong>{s.propertyName}</strong> ({s.propertyRef}){s.city ? `, ${s.city}` : ""} · {s.roomTypeName} · {s.planName}</p>
      <p>{s.checkIn} → {s.checkOut} · {s.occupancies.map((o) => `${o.adults} adult${o.adults > 1 ? "s" : ""}${o.children ? ` + ${o.children} child` : ""}`).join(", ")} · quoted {inr(r.quoted.totalPaise)} incl. GST (client price)</p>
      <p>Customer: {r.customer.name}{r.customer.phone ? ` · ${r.customer.phone}` : ""}{r.customer.email ? ` · ${r.customer.email}` : ""}{r.customer.reference ? ` · ref ${r.customer.reference}` : ""}</p>
      {r.customer.guestNames.length > 0 && <p>Guests: {r.customer.guestNames.join(", ")}</p>}
      {r.notes && <p>Client notes: {r.notes}</p>}
      {r.hotelConfirmation && <p className="font-medium text-emerald-700">Hotel confirmation: {r.hotelConfirmation}</p>}
      {r.decisionNote && <p>Decision note: {r.decisionNote}</p>}
      {(r.status === "SUBMITTED" || r.status === "IN_PROGRESS") && (
        <div className="flex flex-wrap items-center gap-2">
          {r.status === "IN_PROGRESS" && <Input className={`${inputSm} w-44`} placeholder="Hotel confirmation no." value={conf} onChange={(e) => setConf(e.target.value)} />}
          <Input className={`${inputSm} w-72`} placeholder="Note (a reason is needed to decline)" value={note} onChange={(e) => setNote(e.target.value)} />
          {r.status === "SUBMITTED" && <PrimaryBtn disabled={busy} onClick={() => act("take")}>Take</PrimaryBtn>}
          {r.status === "IN_PROGRESS" && <PrimaryBtn disabled={busy} onClick={() => act("confirm")}>Confirm</PrimaryBtn>}
          <SecondaryBtn danger disabled={busy} onClick={() => act("decline")}>Decline</SecondaryBtn>
        </div>
      )}
      <ol className="space-y-0.5 border-l border-slate-200 pl-3 text-[11px] text-slate-500">
        {r.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} · {h.action} by {h.by}{h.note ? ` — ${h.note}` : ""}</li>)}
      </ol>
    </div>
  );
}

export function BookingRequestsTab({ token }: { token: string }) {
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["b2b-admin", "booking-requests", status], queryFn: () => adminCall<{ data: BookingRequest[] }>(`/admin/booking-requests${status ? `?status=${status}` : ""}`, token) });
  const rows = list.data?.data ?? [];
  return (
    <FleetPanel title="Booking requests" description="From B2B clients — arrange the stay offline, then confirm with the hotel's confirmation number or decline with a reason." icon={ClipboardList} bodyClassName="p-0">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
        {FILTERS.map((f) => (
          <button key={f || "open"} onClick={() => setStatus(f)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${status === f ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{f ? REQUEST_STATUS_LABEL[f] : "Open"}</button>
        ))}
      </div>
      {list.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>}
      {list.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(list.error)}</p>}
      {!list.isLoading && rows.length === 0 && <FleetEmptyState icon={ClipboardList} title="No booking requests here" />}
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id}>
            <button className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-[13px] hover:bg-slate-50" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <FleetPill className={TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</FleetPill>
              <span className="font-mono text-[11px] text-slate-500">{r.ref}</span>
              <span className="font-medium text-slate-900">{r.stay.propertyName}</span>
              <span className="text-slate-500">{r.stay.checkIn} → {r.stay.checkOut} · {r.customer.name}</span>
              <span className="flex-1" />
              <span className="text-slate-800">{inr(r.quoted.totalPaise)}</span>
              <span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString("en-IN")}</span>
            </button>
            {open === r.id && <Detail r={r} token={token} />}
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}
