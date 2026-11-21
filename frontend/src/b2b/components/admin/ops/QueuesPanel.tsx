"use client";
// B2B admin → Operations queues (Stage 09): change requests (first answer due within 4 hours — red when late), no-show
// disputes, hotels that couldn't honour a booking, and recent cancellations.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, ClipboardEdit, Loader2, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

type Amendment = { id: string; ref: string; bookingRef: string; orderRef: string; type: string; status: string; guestNames: { room: number; leadGuest: string }[]; guestNamesApplied: boolean; messages: { at: string; from: string; by: string; text: string }[]; firstResponseDueAt: string; firstRespondedAt: string | null };
type Dispute = { id: string; bookingRef: string; orderRef: string; markedAt: string; chargePaise: number; refundPaise: number; dispute: { at: string; message: string } | null };
type Failure = { id: string; bookingRef: string; orderRef: string; reportedBy: string; reportedAt: string; reason: string; status: string };
type Cancellation = { bookingRef: string; orderRef: string; chargePaise: number; refundPaise: number; hotelSharePaise: number; requestedBy: string; status: string; requestedAt: string; reason: string | null };
const when = (d: string) => new Date(d).toLocaleString("en-IN");
const Spinner = () => <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>;

function useAct(token: string, key: string[]) {
  const queryClient = useQueryClient();
  return async (path: string, body: unknown, done: string) => {
    try {
      await adminCall(path, token, { method: "POST", body });
      toast.success(done);
      void queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
}

function AmendmentRow({ a, token }: { a: Amendment; token: string }) {
  const act = useAct(token, ["b2b-admin", "amendments"]);
  const [text, setText] = useState("");
  const [resolution, setResolution] = useState("");
  const late = !a.firstRespondedAt && Date.now() > Date.parse(a.firstResponseDueAt);
  return (
    <div className="space-y-1.5 px-4 py-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <FleetPill className={late ? fleetTone.red : a.firstRespondedAt ? fleetTone.emerald : fleetTone.amber}>{late ? "LATE" : a.status}</FleetPill>
        <span className="font-mono text-[12px] text-slate-700">{a.ref}</span>
        <span className="text-slate-600">{a.type} · {a.bookingRef} · {a.orderRef}</span>
        <span className="ml-auto text-[11px] text-slate-400">first answer due {when(a.firstResponseDueAt)}</span>
      </div>
      {a.messages.map((m, i) => <p key={i} className={`rounded px-2 py-1 ${m.from === "STAFF" ? "bg-orange-50" : "bg-slate-50"}`}><span className="text-[11px] text-slate-500">{m.from === "STAFF" ? m.by : "Buyer"} · {when(m.at)}</span><br />{m.text}</p>)}
      {a.guestNames.length > 0 && <p className="text-slate-700">Asked: {a.guestNames.map((g) => `room ${g.room} → ${g.leadGuest}`).join(", ")} {a.guestNamesApplied ? "(applied)" : <SecondaryBtn onClick={() => act(`/admin/amendments/${a.id}/apply-guest-names`, {}, "Names updated on the booking")}>Apply names</SecondaryBtn>}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Input className={`${inputSm} w-72`} placeholder="Reply to the buyer" value={text} onChange={(e) => setText(e.target.value)} />
        <PrimaryBtn disabled={text.trim().length < 2} onClick={() => act(`/admin/amendments/${a.id}/messages`, { text, waitForCustomer: false }, "Sent")}>Reply</PrimaryBtn>
        <SecondaryBtn disabled={text.trim().length < 2} onClick={() => act(`/admin/amendments/${a.id}/messages`, { text, waitForCustomer: true }, "Sent — waiting for the buyer")}>Ask the buyer</SecondaryBtn>
        <Input className={`${inputSm} w-56`} placeholder="Outcome (to close)" value={resolution} onChange={(e) => setResolution(e.target.value)} />
        <SecondaryBtn disabled={resolution.trim().length < 3} onClick={() => act(`/admin/amendments/${a.id}/close`, { status: "RESOLVED", resolution }, "Resolved")}>Resolve</SecondaryBtn>
      </div>
    </div>
  );
}

function Amendments({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "amendments"], queryFn: () => adminCall<{ data: Amendment[] }>("/admin/amendments", token), refetchInterval: 60_000 });
  return (
    <FleetPanel title="Change requests" description="From website buyers. Answer first ones within 4 hours (red = late). Date or room changes: cancel and rebook for the guest." icon={ClipboardEdit} bodyClassName="p-0">
      {q.isLoading && <Spinner />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && (q.data?.data ?? []).length === 0 && <FleetEmptyState icon={ClipboardEdit} title="No open requests" />}
      <div className="divide-y divide-slate-100">{(q.data?.data ?? []).map((a) => <AmendmentRow key={a.id} a={a} token={token} />)}</div>
    </FleetPanel>
  );
}

function Disputes({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "no-shows"], queryFn: () => adminCall<{ data: Dispute[] }>("/admin/no-show-disputes", token) });
  const act = useAct(token, ["b2b-admin", "no-shows"]);
  const [note, setNote] = useState("");
  return (
    <FleetPanel title="No-show disputes" description="The buyer says they stayed. Check with the hotel: uphold (charge stands) or reverse (stay completed)." icon={UserX} bodyClassName="p-0">
      {!q.isLoading && (q.data?.data ?? []).length === 0 && <FleetEmptyState icon={UserX} title="No disputes" />}
      {(q.data?.data ?? []).map((d) => (
        <div key={d.id} className="space-y-1 border-b border-slate-100 px-4 py-3 text-[13px] last:border-0">
          <p><span className="font-mono text-[12px]">{d.bookingRef}</span> · {d.orderRef} · marked {when(d.markedAt)} · charge {inr(d.chargePaise)}{d.refundPaise ? `, refund ${inr(d.refundPaise)}` : ""}</p>
          {d.dispute && <p className="rounded bg-slate-50 px-2 py-1">Buyer: {d.dispute.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Input className={`${inputSm} w-72`} placeholder="What the hotel said" value={note} onChange={(e) => setNote(e.target.value)} />
            <SecondaryBtn disabled={note.trim().length < 3} onClick={() => act(`/admin/no-shows/${d.id}/resolve`, { decision: "UPHOLD", note }, "Upheld")}>Uphold</SecondaryBtn>
            <PrimaryBtn disabled={note.trim().length < 3} onClick={() => act(`/admin/no-shows/${d.id}/resolve`, { decision: "REVERSE", note }, "Reversed — stay completed")}>Reverse</PrimaryBtn>
          </div>
        </div>
      ))}
    </FleetPanel>
  );
}

function Failures({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "hotel-failures"], queryFn: () => adminCall<{ data: Failure[] }>("/admin/hotel-failures", token) });
  const act = useAct(token, ["b2b-admin", "hotel-failures"]);
  const [note, setNote] = useState("");
  const [alt, setAlt] = useState("");
  return (
    <FleetPanel title="Hotels that couldn't honour" description="Move the guest to a similar hotel (record its reference — the first hotel's payable goes to suspense for Finance) or refund everything." icon={AlertTriangle} bodyClassName="p-0">
      {!q.isLoading && (q.data?.data ?? []).length === 0 && <FleetEmptyState icon={AlertTriangle} title="Nothing open" />}
      {(q.data?.data ?? []).map((f) => (
        <div key={f.id} className="space-y-1 border-b border-slate-100 px-4 py-3 text-[13px] last:border-0">
          <p><span className="font-mono text-[12px]">{f.bookingRef}</span> · {f.orderRef} · {f.reason} · by {f.reportedBy} · {when(f.reportedAt)}</p>
          <div className="flex flex-wrap gap-2">
            <Input className={`${inputSm} w-64`} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Input className={`${inputSm} w-40`} placeholder="New hotel reference" value={alt} onChange={(e) => setAlt(e.target.value)} />
            <SecondaryBtn disabled={note.trim().length < 3 || alt.trim().length < 2} onClick={() => act(`/admin/hotel-failures/${f.id}/resolve`, { action: "RELOCATE", note, alternativeRef: alt }, "Recorded as moved")}>Moved</SecondaryBtn>
            <PrimaryBtn disabled={note.trim().length < 3} onClick={() => act(`/admin/hotel-failures/${f.id}/resolve`, { action: "REFUND", note }, "Refund sent")}>Refund everything</PrimaryBtn>
          </div>
        </div>
      ))}
    </FleetPanel>
  );
}

function Cancellations({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "cancellations"], queryFn: () => adminCall<{ data: Cancellation[] }>("/admin/cancellations", token) });
  return (
    <FleetPanel title="Cancellations" description="Recent cancellations: charge, refund and the hotel's share (D5)." icon={Ban} bodyClassName="p-0">
      {!q.isLoading && (q.data?.data ?? []).length === 0 && <FleetEmptyState icon={Ban} title="No cancellations" />}
      {(q.data?.data ?? []).map((c) => (
        <div key={c.bookingRef} className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] last:border-0">
          <FleetPill className={c.status === "CANCELLED" ? fleetTone.slate : fleetTone.amber}>{c.status}</FleetPill>
          <span className="font-mono text-[12px]">{c.bookingRef}</span>
          <span className="text-slate-600">{c.orderRef} · {c.requestedBy}{c.reason ? ` · ${c.reason}` : ""}</span>
          <span className="ml-auto text-slate-800">charge {inr(c.chargePaise)} · refund {inr(c.refundPaise)} · hotel {inr(c.hotelSharePaise)}</span>
          <span className="text-[11px] text-slate-400">{when(c.requestedAt)}</span>
        </div>
      ))}
    </FleetPanel>
  );
}

export function QueuesPanel({ token }: { token: string }) {
  return (
    <div className="space-y-3">
      <Amendments token={token} />
      <Disputes token={token} />
      <Failures token={token} />
      <Cancellations token={token} />
    </div>
  );
}
