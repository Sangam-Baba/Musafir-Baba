"use client";
// Bus cancellations by MusafirBaba (Stage 18 B7): cancel one bus booking (PNR) or a whole trip with a full refund —
// e.g. the bus broke down or the operator cancelled. One person proposes with a reason; a different person approves;
// it runs once and shows what happened to each booking.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { rupees, type OpsCancellation } from "../../bus";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetPanel, fleetSelectClass, Input, inputSm, Notice, PrimaryBtn, SecondaryBtn } from "./kit";

function Propose({ token, onDone }: { token: string; onDone: () => void }) {
  const [f, setF] = useState({ scope: "BOOKING" as "BOOKING" | "TRIP", target: "", reason: "" });
  const [busy, setBusy] = useState(false);
  async function propose(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminCall("/admin/bus/cancellations", token, { method: "POST", body: { scope: f.scope, reason: f.reason, ...(f.scope === "BOOKING" ? { bookingRef: f.target.trim() } : { tripId: f.target.trim() }) } });
      toast.success("Proposed — a second person must approve");
      setF({ ...f, target: "", reason: "" });
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={propose} className="grid gap-2 md:grid-cols-[10rem_1fr_2fr_auto] md:items-end">
      <select aria-label="What" className={fleetSelectClass} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as "BOOKING" | "TRIP" })}><option value="BOOKING">One booking (PNR)</option><option value="TRIP">A whole trip</option></select>
      <Input className={inputSm} required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder={f.scope === "BOOKING" ? "MBB-XXXX-XXXX" : "trip id"} />
      <Input className={inputSm} required minLength={5} maxLength={500} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Reason (e.g. bus broke down, operator cancelled)" />
      <PrimaryBtn disabled={busy}>Propose full refund</PrimaryBtn>
    </form>
  );
}

export function BusOpsCancellations({ token }: { token: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"PROPOSED" | "DONE" | "REJECTED">("PROPOSED");
  const list = useQuery({ queryKey: ["b2b-admin", "bus-ops-cancel", status], queryFn: () => adminCall<{ data: OpsCancellation[] }>(`/admin/bus/cancellations?status=${status}`, token) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["b2b-admin", "bus-ops-cancel"] });
  async function decide(id: string, approve: boolean) {
    try {
      await adminCall(`/admin/bus/cancellations/${id}/decide`, token, { method: "POST", body: { approve } });
      toast.success(approve ? "Approved — cancelled and refunded" : "Rejected");
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <FleetPanel title="Bus cancellations (full refund)" description="Cancel a booking or a whole trip for the passengers — needs a second person." actions={<select aria-label="Status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="PROPOSED">Waiting for approval</option><option value="DONE">Done</option><option value="REJECTED">Rejected</option></select>}>
      <div className="space-y-4">
        <Propose token={token} onDone={refresh} />
        {list.isError && <Notice tone="red">{errorMessage(list.error)}</Notice>}
        <ul className="space-y-2 text-[13px]">
          {(list.data?.data ?? []).map((c) => (
            <li key={c._id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium text-slate-900">{c.scope === "TRIP" ? `Whole trip ${c.tripId}` : `Booking ${c.bookingRef}`} — {c.reason}</p>
              <p className="text-[12px] text-slate-500">Proposed by {c.proposedBy}{c.decidedBy ? ` · decided by ${c.decidedBy}` : ""}</p>
              {c.results.length > 0 && <p className="mt-1 text-[12px] text-slate-600">{c.results.map((r) => `${r.bookingRef}: ${r.error ? `not done (${r.error})` : `refunded ${rupees(r.refundPaise)}`}`).join(" · ")}</p>}
              {c.status === "PROPOSED" && <div className="mt-2 flex gap-2"><PrimaryBtn onClick={() => decide(c._id, true)}>Approve</PrimaryBtn><SecondaryBtn onClick={() => decide(c._id, false)}>Reject</SecondaryBtn></div>}
            </li>
          ))}
          {list.data && list.data.data.length === 0 && <li className="text-slate-500">Nothing here.</li>}
        </ul>
      </div>
    </FleetPanel>
  );
}
