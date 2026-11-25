"use client";
// Buses and routes (MusafirBaba staff, Stage 18 B2–B3): buses waiting for approval (oldest first) or by status. Open one to see its
// papers (view each file), seat map and amenities, then approve, ask for changes (with a note), suspend or reinstate.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BusFront, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { B2B_API } from "../../api";
import { age } from "../../admin-kyc";
import { AMENITY_LABEL, BUS_STATUS, daysUntil, KIND_LABEL, PAPER_KINDS, PAPER_LABEL, type BusInQueue, type BusStatus } from "../../bus";
import { errorMessage } from "../../messages";
import { SeatMap } from "../bus/SeatMap";
import { adminCall } from "./AdminPassGate";
import { BusProblems } from "./BusProblems";
import { BusRouteReview } from "./BusRouteReview";
import { FleetEmptyState, FleetPanel, FleetPill, fleetSelectClass, fleetTone, Notice, PrimaryBtn, SecondaryBtn } from "./kit";

const TONE: Record<BusStatus, string> = { DRAFT: fleetTone.slate, SUBMITTED: fleetTone.sky, APPROVED: fleetTone.emerald, CHANGES_REQUESTED: fleetTone.amber, SUSPENDED: fleetTone.red, RETIRED: fleetTone.slate };
type Move = "approve" | "requestChanges" | "suspend" | "reinstate" | "retire";
const MOVES: Record<BusStatus, { move: Move; label: string; needsNote?: boolean; danger?: boolean }[]> = {
  SUBMITTED: [{ move: "approve", label: "Approve" }, { move: "requestChanges", label: "Ask for changes", needsNote: true }],
  APPROVED: [{ move: "suspend", label: "Suspend", needsNote: true, danger: true }],
  SUSPENDED: [{ move: "reinstate", label: "Reinstate" }],
  DRAFT: [],
  CHANGES_REQUESTED: [],
  RETIRED: [],
};

function Papers({ bus, token }: { bus: BusInQueue; token: string }) {
  async function view(fileId: string) {
    try {
      const link = await adminCall<{ token: string }>(`/admin/files/${fileId}/link`, token, { method: "POST", body: { orgId: bus.operatorOrgId } });
      window.open(`${B2B_API}/files/download?t=${encodeURIComponent(link.token)}`, "_blank", "noopener");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <table className="w-full text-[12px]">
      <tbody>
        {PAPER_KINDS.map((kind) => {
          const p = bus.papers.find((x) => x.kind === kind);
          const left = p ? daysUntil(p.expiresOn) : null;
          return (
            <tr key={kind} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 font-medium text-slate-700">{PAPER_LABEL[kind]}</td>
              <td className="py-1.5 font-mono text-slate-600">{p?.number ?? "—"}</td>
              <td className={`py-1.5 ${left === null || left < 0 ? "text-red-600" : left <= 30 ? "text-amber-600" : "text-slate-600"}`}>{p ? `till ${p.expiresOn}${left !== null && left < 0 ? " (expired)" : ""}` : "missing"}</td>
              <td className="py-1.5 text-right">{p && <button type="button" onClick={() => view(p.fileId)} className="inline-flex items-center gap-1 text-[#FE5300]"><Eye className="h-3.5 w-3.5" /> View</button>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Decide({ bus, token, onDone }: { bus: BusInQueue; token: string; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const moves = MOVES[bus.status];
  if (!moves.length) return null;
  async function run(move: Move, needsNote?: boolean) {
    if (needsNote && !note.trim()) return toast.error("Write a note for the operator first.");
    setBusy(true);
    try {
      await adminCall(`/admin/bus/vehicles/${bus.id}/decide`, token, { method: "POST", body: { move, note: note.trim() || null } });
      toast.success("Done — the operator is told.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Note for the operator (needed to ask for changes or suspend)" className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px]" />
      <div className="flex flex-wrap gap-2">
        {moves.map((m) =>
          m.move === "approve" || m.move === "reinstate" ? (
            <PrimaryBtn key={m.move} disabled={busy} onClick={() => run(m.move)}>{m.label}</PrimaryBtn>
          ) : (
            <SecondaryBtn key={m.move} danger={m.danger} disabled={busy} onClick={() => run(m.move, m.needsNote)}>{m.label}</SecondaryBtn>
          ),
        )}
      </div>
    </div>
  );
}

function BusCard({ bus, token, onDone }: { bus: BusInQueue; token: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const problems = bus.paperProblems ?? [];
  return (
    <li className="rounded-lg border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
        <BusFront className="h-5 w-5 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[13px] font-semibold text-slate-900">{bus.regNo}</span>
          <span className="block text-[12px] text-slate-500">{bus.operatorName ?? bus.operatorOrgId}{bus.operatorRef ? ` · ${bus.operatorRef}` : ""} · {bus.acType === "AC" ? "AC" : "Non-AC"} {KIND_LABEL[bus.kind]}{bus.layout ? ` · ${bus.layout.decks.reduce((n, d) => n + d.seats.length, 0)} seats` : ""}</span>
        </span>
        {problems.length > 0 && <FleetPill className={fleetTone.amber}>{problems.length} paper problem{problems.length > 1 ? "s" : ""}</FleetPill>}
        <FleetPill className={TONE[bus.status]}>{BUS_STATUS[bus.status].label}</FleetPill>
        <span className="text-[11px] text-slate-400">{age(bus.updatedAt)}</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Papers bus={bus} token={token} />
            {bus.amenities.length > 0 && <p className="text-[12px] text-slate-600"><b>Amenities:</b> {bus.amenities.map((a) => AMENITY_LABEL[a]).join(", ")}</p>}
            {bus.review?.note && <Notice>Last note: {bus.review.note}</Notice>}
            <Decide bus={bus} token={token} onDone={onDone} />
          </div>
          <div>{bus.layout ? <SeatMap decks={bus.layout.decks} /> : <p className="text-[12px] text-red-600">No seat layout.</p>}</div>
        </div>
      )}
    </li>
  );
}

/** Buses and routes waiting for MusafirBaba, one switch apart. */
export function BusReviewTab({ token }: { token: string }) {
  const [view, setView] = useState<"buses" | "routes" | "problems">("buses");
  const pick = (
    <select aria-label="Buses or routes" className={fleetSelectClass} value={view} onChange={(e) => setView(e.target.value as "buses" | "routes" | "problems")}>
      <option value="buses">Buses</option>
      <option value="routes">Routes</option>
      <option value="problems">Trip problems</option>
    </select>
  );
  if (view === "problems")
    return (
      <FleetPanel title="Trip problems" description="Reported by bus companies · oldest first" actions={pick}>
        <BusProblems token={token} />
      </FleetPanel>
    );
  if (view === "routes")
    return (
      <FleetPanel title="Bus routes" description="Stops and times operators sent for approval · oldest first" actions={pick}>
        <BusRouteReview token={token} />
      </FleetPanel>
    );
  return <BusQueue token={token} pick={pick} />;
}

function BusQueue({ token, pick }: { token: string; pick: React.ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<BusStatus>("SUBMITTED");
  const key = ["b2b-admin", "buses", status];
  const list = useQuery({ queryKey: key, queryFn: () => adminCall<{ data: BusInQueue[] }>(`/admin/bus/vehicles?status=${status}`, token), refetchInterval: 30_000 });
  const items = list.data?.data ?? [];
  return (
    <FleetPanel
      title={status === "SUBMITTED" ? "Buses waiting for MusafirBaba" : `Buses — ${BUS_STATUS[status].label}`}
      description={list.data ? `${items.length} shown${status === "SUBMITTED" ? " · oldest first" : ""}` : undefined}
      actions={
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {pick}
          <select aria-label="Status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value as BusStatus)}>
            {(Object.keys(BUS_STATUS) as BusStatus[]).map((s) => <option key={s} value={s}>{BUS_STATUS[s].label}</option>)}
          </select>
        </div>
      }
    >
      {list.isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : list.isError ? (
        <Notice tone="red">{errorMessage(list.error)}</Notice>
      ) : items.length === 0 ? (
        <FleetEmptyState icon={BusFront} title="Nothing here" hint={status === "SUBMITTED" ? "No bus is waiting for approval." : "No buses with this status."} />
      ) : (
        <ul className="space-y-2">{items.map((b) => <BusCard key={b.id} bus={b} token={token} onDone={() => qc.invalidateQueries({ queryKey: ["b2b-admin", "buses"] })} />)}</ul>
      )}
    </FleetPanel>
  );
}
