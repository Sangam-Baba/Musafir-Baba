"use client";
// Cancellation slabs of a bus company (Stage 18 B7): "within N hours of departure → P % of the seat price". The
// strictest slab that has started applies; 720 hours or more works as "any time". New tickets are sold with these;
// tickets already sold keep the slabs they were sold with.
import { useQuery } from "@tanstack/react-query";
import { Plus, Undo2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import type { CancellationPolicy } from "../../bus";
import { errorMessage } from "../../messages";
import { Panel, Pill } from "../portal/ui";

const cell = "w-24 rounded border border-slate-300 bg-white px-2 py-1 text-[13px]";

export function PolicyPanel({ canManage }: { canManage: boolean }) {
  const p = useQuery({ queryKey: ["b2b", "bus", "cancellation-policy"], queryFn: () => b2b<CancellationPolicy>("/bus/cancellation-policy") });
  const [slabs, setSlabs] = useState<{ hoursBefore: number; percent: number }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (p.data) setSlabs(p.data.slabs);
  }, [p.data]);
  if (!p.data) return <p className="text-[13px] text-slate-500">Loading…</p>;
  const set = (i: number, patch: Partial<(typeof slabs)[number]>) => setSlabs(slabs.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  async function save() {
    setBusy(true);
    try {
      await b2b("/bus/cancellation-policy", { method: "PUT", body: { slabs, expectedVersion: p.data?.version ?? 0 } });
      toast.success("Cancellation slabs saved — new tickets use them");
      await p.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Cancellation charges" subtitle="What a passenger pays to cancel, by how close the bus is to leaving their boarding stop." action={p.data.isDefault ? <Pill tone="amber">MusafirBaba default</Pill> : undefined}>
      <fieldset disabled={!canManage || busy} className="space-y-2 text-[13px]">
        {slabs.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span>Within</span>
            <input type="number" min={0} max={8760} value={s.hoursBefore} onChange={(e) => set(i, { hoursBefore: Number(e.target.value) })} className={cell} aria-label="Hours before departure" />
            <span>hours of departure{s.hoursBefore >= 720 ? " (any time)" : ""}: charge</span>
            <input type="number" min={0} max={100} value={s.percent} onChange={(e) => set(i, { percent: Number(e.target.value) })} className={cell} aria-label="Percent charged" />
            <span>%</span>
            {canManage && <button type="button" aria-label="Remove slab" onClick={() => setSlabs(slabs.filter((_, j) => j !== i))} className="text-red-600"><X className="h-4 w-4" /></button>}
          </div>
        ))}
        {slabs.length === 0 && <p className="text-slate-500">No slabs — free cancellation until departure.</p>}
        {canManage && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={slabs.length >= 8} onClick={() => setSlabs([...slabs, { hoursBefore: 6, percent: 50 }])} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px]"><Plus className="h-3.5 w-3.5" /> Add slab</button>
            <button type="button" onClick={() => setSlabs(p.data?.slabs ?? [])} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px]"><Undo2 className="h-3.5 w-3.5" /> Undo changes</button>
            <button type="button" onClick={save} className="rounded-md bg-[#FE5300] px-3 py-1 text-[12px] font-medium text-white">Save</button>
          </div>
        )}
      </fieldset>
    </Panel>
  );
}
