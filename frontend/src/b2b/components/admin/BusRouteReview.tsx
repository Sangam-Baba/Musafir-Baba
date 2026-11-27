"use client";
// Bus routes (MusafirBaba staff, Stage 18 B3): routes waiting for approval (oldest first) or by status, with the
// operator, each stop's point and time; approve, ask for changes (note) or suspend (note). Only approved routes get trips.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Route as RouteIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { age } from "../../admin-kyc";
import { BUS_STATUS, stopTime, type BusStatus, type RouteInQueue } from "../../bus";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPill, fleetSelectClass, fleetTone, Notice, PrimaryBtn, SecondaryBtn } from "./kit";

const TONE: Record<BusStatus, string> = { DRAFT: fleetTone.slate, SUBMITTED: fleetTone.sky, APPROVED: fleetTone.emerald, CHANGES_REQUESTED: fleetTone.amber, SUSPENDED: fleetTone.red, RETIRED: fleetTone.slate };

function Decide({ route, token, onDone }: { route: RouteInQueue; token: string; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(move: string, needsNote = false) {
    if (needsNote && !note.trim()) return toast.error("Write a note for the operator first.");
    setBusy(true);
    try {
      await adminCall(`/admin/bus/routes/${route.id}/decide`, token, { method: "POST", body: { move, note: note.trim() || null } });
      toast.success("Done — the operator is told.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (!["SUBMITTED", "APPROVED", "SUSPENDED"].includes(route.status)) return null;
  return (
    <div className="space-y-2">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Note for the operator (needed to ask for changes or suspend)" className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px]" />
      <div className="flex flex-wrap gap-2">
        {route.status === "SUBMITTED" && <PrimaryBtn disabled={busy} onClick={() => run("approve")}>Approve</PrimaryBtn>}
        {route.status === "SUBMITTED" && <SecondaryBtn disabled={busy} onClick={() => run("requestChanges", true)}>Ask for changes</SecondaryBtn>}
        {route.status === "APPROVED" && <SecondaryBtn danger disabled={busy} onClick={() => run("suspend", true)}>Suspend</SecondaryBtn>}
        {route.status === "SUSPENDED" && <PrimaryBtn disabled={busy} onClick={() => run("reinstate")}>Reinstate</PrimaryBtn>}
      </div>
    </div>
  );
}

function RouteCard({ route, token, onDone }: { route: RouteInQueue; token: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
        <RouteIcon className="h-5 w-5 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-slate-900">{route.name}</span>
          <span className="block text-[12px] text-slate-500">{route.operatorName ?? route.operatorOrgId}{route.operatorRef ? ` · ${route.operatorRef}` : ""} · {route.stops.length} stops</span>
        </span>
        <FleetPill className={TONE[route.status]}>{BUS_STATUS[route.status].label}</FleetPill>
        <span className="text-[11px] text-slate-400">{age(route.updatedAt)}</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
          <ol className="space-y-1 text-[13px]">
            {route.stops.map((s, i) => (
              <li key={s.stopId} className="flex gap-2">
                <span className="w-5 text-right text-slate-400">{i + 1}.</span>
                <span className="w-32 shrink-0 text-slate-600">{stopTime(s)}</span>
                <span className="font-medium text-slate-800">{route.stopNames[s.stopId] ?? "—"}</span>
                <span className="text-[11px] text-slate-400">{[s.boarding && "board", s.dropping && "get off"].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            {route.review?.note && <Notice>Last note: {route.review.note}</Notice>}
            <Decide route={route} token={token} onDone={onDone} />
          </div>
        </div>
      )}
    </li>
  );
}

export function BusRouteReview({ token }: { token: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<BusStatus>("SUBMITTED");
  const list = useQuery({ queryKey: ["b2b-admin", "bus-routes", status], queryFn: () => adminCall<{ data: RouteInQueue[] }>(`/admin/bus/routes?status=${status}`, token), refetchInterval: 30_000 });
  const items = list.data?.data ?? [];
  return (
    <div className="space-y-3">
      <select aria-label="Route status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value as BusStatus)}>
        {(Object.keys(BUS_STATUS) as BusStatus[]).map((s) => <option key={s} value={s}>{BUS_STATUS[s].label}</option>)}
      </select>
      {list.isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : list.isError ? (
        <Notice tone="red">{errorMessage(list.error)}</Notice>
      ) : items.length === 0 ? (
        <FleetEmptyState icon={RouteIcon} title="Nothing here" hint={status === "SUBMITTED" ? "No route is waiting for approval." : "No routes with this status."} />
      ) : (
        <ul className="space-y-2">{items.map((r) => <RouteCard key={r.id} route={r} token={token} onDone={() => qc.invalidateQueries({ queryKey: ["b2b-admin", "bus-routes"] })} />)}</ul>
      )}
    </div>
  );
}
