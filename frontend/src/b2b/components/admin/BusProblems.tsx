"use client";
// Trip problems reported by bus companies (Stage 18 B7): oldest first; resolve with a note. To refund passengers, use
// Services → Bus cancellations (whole trip or one booking, two people).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PROBLEM_LABEL, type TripProblem } from "../../bus";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { fleetSelectClass, Input, inputSm, Notice, PrimaryBtn } from "./kit";

export function BusProblems({ token }: { token: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"OPEN" | "RESOLVED">("OPEN");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const list = useQuery({ queryKey: ["b2b-admin", "bus-problems", status], queryFn: () => adminCall<{ data: TripProblem[] }>(`/admin/bus/problems?status=${status}`, token) });
  async function resolve(id: string) {
    try {
      await adminCall(`/admin/bus/problems/${id}/resolve`, token, { method: "POST", body: { resolution: notes[id] ?? "" } });
      toast.success("Resolved");
      qc.invalidateQueries({ queryKey: ["b2b-admin", "bus-problems"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="space-y-3 text-[13px]">
      <select aria-label="Status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value as "OPEN" | "RESOLVED")}><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option></select>
      {list.isError && <Notice tone="red">{errorMessage(list.error)}</Notice>}
      {(list.data?.data ?? []).map((p) => (
        <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="font-medium">{PROBLEM_LABEL[p.kind]}{p.delayMinutes ? ` · ${p.delayMinutes} min` : ""} — trip {p.tripId} on {p.tripDate}</p>
          <p className="text-slate-600">{p.note}</p>
          <p className="text-[12px] text-slate-500">Company {p.operatorOrgId} · {new Date(p.createdAt).toLocaleString("en-IN")}</p>
          {p.status === "OPEN" ? (
            <div className="mt-2 flex gap-2"><Input className={inputSm} value={notes[p.id] ?? ""} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} placeholder="What was done (passengers told, refunded…)" /><PrimaryBtn disabled={(notes[p.id] ?? "").trim().length < 3} onClick={() => resolve(p.id)}>Resolve</PrimaryBtn></div>
          ) : <p className="mt-1 text-emerald-700">Resolved: {p.resolution}</p>}
        </div>
      ))}
      {list.data && list.data.data.length === 0 && <p className="text-slate-500">Nothing here.</p>}
    </div>
  );
}
