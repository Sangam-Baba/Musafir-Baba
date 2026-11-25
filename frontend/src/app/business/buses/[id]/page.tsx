"use client";
// One bus (bus operators, Stage 18 B2): details and amenities, the seat layout it uses, its four papers, and
// "Send for approval". Changing the seat layout of an approved bus sends it back to MusafirBaba.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BusFront, FileText, LayoutGrid, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { AMENITIES, AMENITY_LABEL, BUS_KINDS, BUS_STATUS, KIND_LABEL, PAPER_LABEL, type Amenity, type Bus, type BusKind, type Layout } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { BusPapers } from "@/b2b/components/bus/BusPapers";
import { BusPhotos } from "@/b2b/components/bus/BusPhotos";
import { SeatMap } from "@/b2b/components/bus/SeatMap";
import { Check, inputCls } from "@/b2b/components/listing/ui";
import { PageHeader, Panel, Pill } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

export default function BusPage() {
  return <BusinessShell>{(me) => <BusDetail me={me} />}</BusinessShell>;
}

type Details = { name: string; acType: "AC" | "NON_AC"; kind: BusKind; layoutId: string; amenities: Amenity[] };
const detailsOf = (b: Bus): Details => ({ name: b.name ?? "", acType: b.acType, kind: b.kind, layoutId: b.layoutId ?? "", amenities: b.amenities });

function DetailsForm({ bus, layouts, canManage, onSaved }: { bus: Bus; layouts: Layout[]; canManage: boolean; onSaved: (b: Bus) => void }) {
  const [form, setForm] = useState<Details>(detailsOf(bus));
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(detailsOf(bus)), [bus]);
  const editable = canManage && bus.status !== "SUBMITTED" && bus.status !== "RETIRED";
  const changed = JSON.stringify(form) !== JSON.stringify(detailsOf(bus));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (bus.status === "APPROVED" && form.layoutId !== (bus.layoutId ?? "") && !window.confirm("Changing the seat layout sends this bus back to MusafirBaba for approval. Continue?")) return;
    setBusy(true);
    try {
      onSaved(await b2b<Bus>(`/bus/vehicles/${bus.id}`, { method: "PATCH", body: { ...form, name: form.name.trim() || null, layoutId: form.layoutId || null, expectedVersion: bus.version } }));
      toast.success("Bus saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const toggle = (a: Amenity, on: boolean) => setForm({ ...form, amenities: on ? [...form.amenities, a] : form.amenities.filter((x) => x !== a) });
  return (
    <form onSubmit={save} className="space-y-3">
      <fieldset disabled={!editable || busy} className="grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-medium text-slate-700">Name shown to travellers (optional)<input maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shree Travels Volvo" className={inputCls} /></label>
        <label className="text-[12px] font-medium text-slate-700">Seat layout
          <select value={form.layoutId} onChange={(e) => setForm({ ...form, layoutId: e.target.value })} className={inputCls}>
            <option value="">— pick a layout —</option>
            {layouts.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.seatCount} seats)</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-slate-700">AC
          <select value={form.acType} onChange={(e) => setForm({ ...form, acType: e.target.value as "AC" | "NON_AC" })} className={inputCls}><option value="AC">AC</option><option value="NON_AC">Non-AC</option></select>
        </label>
        <label className="text-[12px] font-medium text-slate-700">Kind
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BusKind })} className={inputCls}>{BUS_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
        </label>
        <div className="sm:col-span-2">
          <p className="text-[12px] font-medium text-slate-700">Amenities</p>
          <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
            {AMENITIES.map((a) => <Check key={a} label={AMENITY_LABEL[a]} checked={form.amenities.includes(a)} onChange={(on) => toggle(a, on)} disabled={!editable} />)}
          </div>
        </div>
      </fieldset>
      {editable && <button disabled={busy || !changed} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">Save details</button>}
      {bus.status === "SUBMITTED" && <p className="text-[12px] text-slate-500">Waiting for MusafirBaba — details can be changed again after the review.</p>}
    </form>
  );
}

function StatusBanner({ bus }: { bus: Bus }) {
  const s = BUS_STATUS[bus.status];
  const missing = (bus.paperProblems ?? []).map((p) => `${PAPER_LABEL[p.kind]} ${p.code === "PAPER_EXPIRED" ? "expired" : "missing"}`);
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <Pill tone={s.tone}>{s.label}</Pill>
      {bus.status === "APPROVED" && <Pill tone={bus.sellable ? "green" : "red"}>{bus.sellable ? "Can be sold" : "Can't be sold until papers are fixed"}</Pill>}
      <div className="min-w-0 flex-1 text-[13px] text-slate-700">
        {bus.review?.note && <p><b>Note from MusafirBaba:</b> {bus.review.note}</p>}
        {missing.length > 0 && bus.status !== "RETIRED" && <p className="text-amber-700">To fix: {missing.join(" · ")}</p>}
      </div>
    </div>
  );
}

function Actions({ bus, onSaved }: { bus: Bus; onSaved: (b: Bus) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (action: "submit" | "retire", done: string) => {
    if (action === "retire" && !window.confirm("Retire this bus? It can't be sold any more and this can't be undone.")) return;
    setBusy(true);
    try {
      onSaved(await b2b<Bus>(`/bus/vehicles/${bus.id}/${action}`, { method: "POST", body: { expectedVersion: bus.version } }));
      toast.success(done);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const canSubmit = bus.status === "DRAFT" || bus.status === "CHANGES_REQUESTED";
  return (
    <div className="flex gap-2">
      {canSubmit && <button type="button" disabled={busy} onClick={() => run("submit", "Sent to MusafirBaba for approval")} className="inline-flex items-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"><Send className="h-4 w-4" /> Send for approval</button>}
      {bus.status !== "RETIRED" && <button type="button" disabled={busy} onClick={() => run("retire", "Bus retired")} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-[13px] text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Retire</button>}
    </div>
  );
}

function BusDetail({ me }: { me: Me }) {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const token = useBusinessSession((s) => s.accessToken);
  const canRead = me.permissions.includes("bus-catalog.vehicle.read");
  const canManage = me.permissions.includes("bus-catalog.vehicle.manage") && !me.viewAs;
  const key = ["b2b", "bus", id, token, me.currentOrgId];
  const bus = useQuery({ queryKey: key, queryFn: () => b2b<Bus>(`/bus/vehicles/${id}`), enabled: canRead });
  const layouts = useQuery({ queryKey: ["b2b", "bus-layouts", token, me.currentOrgId], queryFn: () => b2b<{ data: Layout[] }>("/bus/layouts"), enabled: canRead });
  if (!canRead) return <p className="text-[13px] text-slate-600">You don&apos;t have access to the buses of this company.</p>;
  if (bus.isError) return <p className="text-[13px] text-red-600">{errorMessage(bus.error)}</p>;
  if (!bus.data) return <p className="text-[13px] text-slate-500">Loading…</p>;
  const b = bus.data;
  const saved = (next: Bus) => (qc.setQueryData(key, next), qc.invalidateQueries({ queryKey: ["b2b", "buses"] }));
  const layout = layouts.data?.data.find((l) => l.id === b.layoutId);
  return (
    <div className="space-y-4">
      <Link href="/business/buses" className="inline-flex items-center gap-1 text-[12px] text-slate-600 hover:text-[#FE5300]"><ArrowLeft className="h-3.5 w-3.5" /> My Buses</Link>
      <PageHeader crumb="My Buses" title={b.regNo} subtitle={[b.name, b.acType === "AC" ? "AC" : "Non-AC", KIND_LABEL[b.kind]].filter(Boolean).join(" · ")} actions={canManage && <Actions bus={b} onSaved={saved} />} />
      <StatusBanner bus={b} />
      <Panel icon={BusFront} title="Details" subtitle="What travellers see, and which seat layout this bus has.">
        <DetailsForm bus={b} layouts={layouts.data?.data ?? []} canManage={canManage} onSaved={saved} />
      </Panel>
      <Panel icon={FileText} title="Papers" subtitle="All four must be valid to send the bus for approval and to keep selling it. We remind you 30 and 7 days before one expires.">
        <BusPapers bus={b} canManage={canManage && b.status !== "RETIRED"} canView={me.permissions.includes("kyc.application.read")} onSaved={saved} />
      </Panel>
      <Panel title="Photos" subtitle="Outside, inside and seats — the first one shows in search.">
        <BusPhotos bus={b} canManage={canManage && b.status !== "RETIRED"} onChanged={() => qc.invalidateQueries({ queryKey: key })} />
      </Panel>
      {layout && (
        <Panel icon={LayoutGrid} title={`Seats — ${layout.name}`} subtitle={`${layout.seatCount} seats${layout.ladiesSeats ? ` · ${layout.ladiesSeats} ladies` : ""}`} action={<Link href="/business/buses/layouts" className="text-[12px] text-[#FE5300]">Edit layouts</Link>}>
          <SeatMap decks={layout.decks} />
        </Panel>
      )}
    </div>
  );
}
