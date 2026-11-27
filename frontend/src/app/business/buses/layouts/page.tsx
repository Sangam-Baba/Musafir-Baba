"use client";
// Seat layouts (bus operators, Stage 18 B2): start from a common layout, then add / remove seats, mark ladies seats,
// change seat types and numbers. A layout used by a bus that is approved or waiting is locked — copy it to change it.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, LayoutGrid, Minus, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "@/b2b/api";
import { LAYOUT_PROBLEM, MAX_ROWS, type DeckGrid, type Layout, type LayoutTemplate } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { applyTool, SeatMap, TOOLS, type Tool } from "@/b2b/components/bus/SeatMap";
import { inputCls } from "@/b2b/components/listing/ui";
import { PageHeader, Panel, Pill } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

export default function LayoutsPage() {
  return <BusinessShell>{(me) => <Layouts me={me} />}</BusinessShell>;
}

function problemsOf(err: unknown): string[] {
  if (!(err instanceof B2BError) || err.code !== "LAYOUT_INVALID") return [];
  const list = ((err.details as { problems?: { code: string }[] }).problems ?? []).map((p) => LAYOUT_PROBLEM[p.code] ?? p.code);
  return [...new Set(list)];
}

function NewLayout({ templates, onCreated }: { templates: LayoutTemplate[]; onCreated: (l: Layout) => void }) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onCreated(await b2b<Layout>("/bus/layouts", { method: "POST", body: { name, template: template || templates[0]?.key } }));
      setName("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={create} className="flex flex-wrap items-end gap-3">
      <label className="min-w-[200px] flex-1 text-[12px] font-medium text-slate-700">
        Layout name
        <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Volvo 9600 sleeper" className={inputCls} />
      </label>
      <label className="min-w-[220px] flex-1 text-[12px] font-medium text-slate-700">
        Start from
        <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputCls}>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
      </label>
      <button disabled={busy || name.trim().length < 2} className="inline-flex items-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50">
        <Plus className="h-4 w-4" /> Create layout
      </button>
    </form>
  );
}

function RowButtons({ decks, setDecks }: { decks: DeckGrid[]; setDecks: (d: DeckGrid[]) => void }) {
  const resize = (i: number, by: number) =>
    setDecks(decks.map((d, j) => (j === i ? { ...d, rows: d.rows + by, seats: d.seats.filter((s) => s.row < d.rows + by) } : d)));
  return (
    <div className="flex flex-wrap gap-3 text-[12px] text-slate-600">
      {decks.map((d, i) => (
        <span key={d.deck} className="inline-flex items-center gap-1.5">
          {d.deck === "LOWER" ? "Lower" : "Upper"} deck rows: <b>{d.rows}</b>
          <button type="button" aria-label="One row less" disabled={d.rows <= 1} onClick={() => resize(i, -1)} className="rounded border border-slate-300 p-0.5 disabled:opacity-40"><Minus className="h-3 w-3" /></button>
          <button type="button" aria-label="One row more" disabled={d.rows >= MAX_ROWS} onClick={() => resize(i, 1)} className="rounded border border-slate-300 p-0.5 disabled:opacity-40"><Plus className="h-3 w-3" /></button>
        </span>
      ))}
    </div>
  );
}

function Editor({ layout, canManage, onSaved }: { layout: Layout; canManage: boolean; onSaved: (l: Layout) => void }) {
  const [decks, setDecks] = useState<DeckGrid[]>(layout.decks);
  const [tool, setTool] = useState<Tool>("seat");
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => (setDecks(layout.decks), setProblems([])), [layout]);
  const changed = JSON.stringify(decks) !== JSON.stringify(layout.decks);
  const seats = decks.reduce((n, d) => n + d.seats.length, 0);

  async function run(label: string, call: () => Promise<Layout>) {
    setBusy(true);
    setProblems([]);
    try {
      onSaved(await call());
      toast.success(label);
    } catch (err) {
      setProblems(problemsOf(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const save = () => run("Layout saved", () => b2b<Layout>(`/bus/layouts/${layout.id}`, { method: "PATCH", body: { decks, expectedVersion: layout.version } }));
  const copy = () => run("Copy made — you can change it", () => b2b<Layout>(`/bus/layouts/${layout.id}/copy`, { method: "POST", body: { name: `${layout.name} (copy)`.slice(0, 80) } }));

  return (
    <Panel icon={LayoutGrid} title={layout.name} subtitle={`${seats} seats · ${decks.length === 2 ? "two decks" : "one deck"} · ${decks.flatMap((d) => d.seats).filter((s) => s.ladies).length} ladies seats`}
      action={canManage && (
        <div className="flex gap-2">
          <button type="button" onClick={copy} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] disabled:opacity-50"><Copy className="h-3.5 w-3.5" /> Copy</button>
          <button type="button" onClick={save} disabled={busy || !changed} className="inline-flex items-center gap-1 rounded-md bg-[#FE5300] px-2.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save</button>
        </div>
      )}
    >
      {canManage && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map((t) => (
              <button key={t.value} type="button" onClick={() => setTool(t.value)} className={`rounded-full px-3 py-1 text-[12px] ${tool === t.value ? "bg-[#FE5300] text-white" : "border border-slate-300 text-slate-700"}`}>{t.label}</button>
            ))}
          </div>
          <p className="text-[12px] text-slate-500">{TOOLS.find((t) => t.value === tool)?.hint}</p>
          <RowButtons decks={decks} setDecks={setDecks} />
        </div>
      )}
      {problems.length > 0 && (
        <ul className="mb-3 list-disc rounded-md border border-red-200 bg-red-50 py-2 pl-6 pr-3 text-[12px] text-red-700">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <SeatMap decks={decks} onCell={canManage ? (i, r, c) => setDecks(applyTool(decks, i, r, c, tool, (now) => window.prompt("New seat number", now))) : undefined} />
    </Panel>
  );
}

function Layouts({ me }: { me: Me }) {
  const qc = useQueryClient();
  const token = useBusinessSession((s) => s.accessToken);
  const canRead = me.permissions.includes("bus-catalog.vehicle.read");
  const canManage = me.permissions.includes("bus-catalog.vehicle.manage") && !me.viewAs;
  const key = ["b2b", "bus-layouts", token, me.currentOrgId];
  const list = useQuery({ queryKey: key, queryFn: () => b2b<{ data: Layout[] }>("/bus/layouts"), enabled: canRead });
  const templates = useQuery({ queryKey: ["b2b", "bus-templates"], queryFn: () => b2b<{ data: LayoutTemplate[] }>("/bus/layout-templates"), enabled: canRead, staleTime: 3_600_000 });
  const [openId, setOpenId] = useState<string | null>(null);
  if (!canRead) return <p className="text-[13px] text-slate-600">You don&apos;t have access to the buses of this company.</p>;
  const items = list.data?.data ?? [];
  const open = items.find((l) => l.id === openId) ?? items[0];
  const saved = (l: Layout) => (setOpenId(l.id), qc.invalidateQueries({ queryKey: key }));
  return (
    <div className="space-y-4">
      <Link href="/business/buses" className="inline-flex items-center gap-1 text-[12px] text-slate-600 hover:text-[#FE5300]"><ArrowLeft className="h-3.5 w-3.5" /> My Buses</Link>
      <PageHeader crumb="My Buses / Seat layouts" title="Seat" highlight="layouts" subtitle="Draw each kind of bus once — exactly as the seats are inside — then pick it for every bus of that kind." />
      {canManage && templates.data && (
        <Panel title="New layout" subtitle="Pick the closest common layout; you can change every seat after.">
          <NewLayout templates={templates.data.data} onCreated={saved} />
        </Panel>
      )}
      {list.isLoading ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No layouts yet. Create one above.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <ul className="space-y-1.5">
            {items.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setOpenId(l.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-[13px] ${open?.id === l.id ? "border-[#FE5300] bg-orange-50/50" : "border-slate-200 bg-white"}`}>
                  <span className="block font-medium text-slate-900">{l.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1"><Pill tone="blue">{l.seatCount} seats</Pill>{l.deckCount === 2 && <Pill tone="violet">2 decks</Pill>}{l.ladiesSeats > 0 && <Pill tone="red">{l.ladiesSeats} ladies</Pill>}</span>
                </button>
              </li>
            ))}
          </ul>
          {open && <Editor layout={open} canManage={canManage} onSaved={saved} />}
        </div>
      )}
    </div>
  );
}
