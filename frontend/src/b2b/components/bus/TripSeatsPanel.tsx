"use client";
// One trip for the operator (Stage 18 B3–B4): stops, the seat map, counter blocks (pick seats → block for the whole
// route or part of it → they disappear for every buyer at once; release to sell them again) and stop / restart online
// sale. Taken seats are shaded; a seat sold for one part of the route can still be blocked for another part.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { istTime, legsTaken, type SeatClaim, type TripDetail } from "../../bus";
import { errorMessage } from "../../messages";
import type { Me } from "../../types";
import { inputCls } from "../listing/ui";
import { Panel, Pill } from "../portal/ui";
import { ReportProblem } from "./ReportProblem";
import { SeatMap, seatAt } from "./SeatMap";

function BlockForm({ trip, seats, onDone }: { trip: TripDetail; seats: string[]; onDone: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fromIdx = from ? trip.stops.findIndex((s) => s.stopId === from) : 0;
  async function block() {
    setBusy(true);
    try {
      await b2b(`/bus/trips/${trip.id}/blocks`, { method: "POST", body: { seats, fromStopId: from || null, toStopId: to || null, note: note || null } });
      toast.success(`${seats.join(", ")} blocked`);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2 rounded-md border border-orange-200 bg-orange-50/50 p-3 sm:grid-cols-2">
      <p className="text-[13px] font-medium text-slate-800 sm:col-span-2">Block {seats.join(", ")}</p>
      <label className="text-[11px] text-slate-600">From
        <select value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls}>
          <option value="">Start of the route</option>
          {trip.stops.filter((s) => s.boarding).map((s) => <option key={s.stopId} value={s.stopId}>{s.name}</option>)}
        </select>
      </label>
      <label className="text-[11px] text-slate-600">To
        <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}>
          <option value="">End of the route</option>
          {trip.stops.filter((s, i) => s.dropping && i > fromIdx).map((s) => <option key={s.stopId} value={s.stopId}>{s.name}</option>)}
        </select>
      </label>
      <label className="text-[11px] text-slate-600 sm:col-span-2">Note (optional)<input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sold at Kashmere Gate counter" className={inputCls} /></label>
      <button type="button" disabled={busy} onClick={block} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50 sm:col-span-2"><Lock className="h-4 w-4" /> Block seats</button>
    </div>
  );
}

function Blocks({ trip, blocks, canBlock, onDone }: { trip: TripDetail; blocks: SeatClaim[]; canBlock: boolean; onDone: () => void }) {
  async function release(id: string) {
    try {
      await b2b(`/bus/blocks/${id}/release`, { method: "POST" });
      toast.success("Released — the seats are on sale again");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  if (!blocks.length) return <p className="text-[12px] text-slate-500">No counter blocks.</p>;
  return (
    <ul className="space-y-1.5">
      {blocks.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-[12px]">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium text-slate-800">{b.seats.join(", ")}</span>
          <span className="text-slate-500">{trip.stops[b.fromIdx]?.name} → {trip.stops[b.toIdx]?.name}{b.note ? ` · ${b.note}` : ""}</span>
          {canBlock && <button type="button" onClick={() => release(b.id)} className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5"><Unlock className="h-3 w-3" /> Release</button>}
        </li>
      ))}
    </ul>
  );
}

export function TripSeatsPanel({ id, me, token }: { id: string; me: Me; token: string | null }) {
  const qc = useQueryClient();
  const canBlock = me.permissions.includes("bus-inventory.seat.block") && !me.viewAs;
  const canSale = me.permissions.includes("bus-inventory.trip.manage") && !me.viewAs;
  const key = ["b2b", "bus-trip", id, token, me.currentOrgId];
  const trip = useQuery({ queryKey: key, queryFn: () => b2b<TripDetail & { saleStopped: boolean }>(`/bus/trips/${id}`) });
  const blocks = useQuery({ queryKey: [...key, "blocks"], queryFn: () => b2b<{ data: SeatClaim[] }>(`/bus/trips/${id}/blocks`) });
  const [picked, setPicked] = useState<string[]>([]);
  if (trip.isError) return <p className="text-[13px] text-red-600">{errorMessage(trip.error)}</p>;
  if (!trip.data) return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  const t = trip.data;
  const refresh = () => (setPicked([]), qc.invalidateQueries({ queryKey: key }));
  const taken = t.decks.flatMap((d) => d.seats).filter((s) => s.taken);
  async function toggleSale() {
    try {
      await b2b(`/bus/trips/${id}/sale`, { method: "PUT", body: { stopped: !t.saleStopped } });
      toast.success(t.saleStopped ? "Online sale restarted" : "Online sale stopped — counter blocks still work");
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  const pick = (deckIndex: number, row: number, col: number) => {
    const d = t.decks[deckIndex];
    const s = d && seatAt(d, row, col);
    if (s) setPicked(picked.includes(s.no) ? picked.filter((x) => x !== s.no) : [...picked, s.no]);
  };
  const live = t.status === "SCHEDULED";
  return (
    <Panel
      title={`${t.stops[0]?.name ?? ""} → ${t.stops[t.stops.length - 1]?.name ?? ""}`}
      subtitle={`${istTime(t.departAt)} · ${t.seatCount} seats · ${taken.length} taken`}
      action={canSale && live && <button type="button" onClick={toggleSale} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] ${t.saleStopped ? "bg-emerald-600 text-white" : "border border-red-200 text-red-600"}`}><Ban className="h-3.5 w-3.5" /> {t.saleStopped ? "Restart online sale" : "Stop online sale"}</button>}
    >
      {t.saleStopped && <p className="mb-3"><Pill tone="red">Online sale stopped</Pill></p>}
      {canSale && live && <div className="mb-3"><ReportProblem tripId={t.id} /></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <ol className="space-y-1.5 text-[13px]">
            {t.stops.map((s) => (
              <li key={s.stopId} className="flex gap-2"><span className="w-28 shrink-0 text-slate-500">{istTime(s.at)}</span><span className="font-medium text-slate-800">{s.name}</span></li>
            ))}
          </ol>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Counter blocks</p>
            <Blocks trip={t} blocks={blocks.data?.data ?? []} canBlock={canBlock} onDone={refresh} />
          </div>
        </div>
        <div className="space-y-3">
          {canBlock && live && <p className="text-[12px] text-slate-500">Click seats to pick them, then block them for the counter.</p>}
          <SeatMap decks={t.decks} selected={picked} onCell={canBlock && live ? pick : undefined} />
          {picked.length > 0 && <BlockForm trip={t} seats={picked} onDone={refresh} />}
          {taken.length > 0 && <p className="text-[12px] text-slate-600">Taken: {taken.map((s) => `${s.no} (${legsTaken(s.taken ?? 0)}/${t.stops.length - 1} legs)`).join(", ")}</p>}
        </div>
      </div>
    </Panel>
  );
}
