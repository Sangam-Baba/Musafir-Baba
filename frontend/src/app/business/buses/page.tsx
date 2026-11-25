"use client";
// My Buses (bus operators, Stage 18 B2): every bus with its status and papers, and a new bus (registration number,
// AC / non-AC, kind). Details, seat layout and papers are filled on the bus page, then sent to MusafirBaba.
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BusFront, CheckCircle2, Clock, FilePen, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BUS_KINDS, BUS_STATUS, KIND_LABEL, type Bus, type BusKind } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { inputCls } from "@/b2b/components/listing/ui";
import { PageHeader, Pill, StatCard } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

export default function BusesPage() {
  return <BusinessShell>{(me) => <Buses me={me} />}</BusinessShell>;
}

function NewBus() {
  const router = useRouter();
  const [form, setForm] = useState<{ regNo: string; acType: "AC" | "NON_AC"; kind: BusKind }>({ regNo: "", acType: "AC", kind: "SLEEPER" });
  const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const bus = await b2b<Bus>("/bus/vehicles", { method: "POST", body: form });
      router.push(`/business/buses/${bus.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <label className="min-w-[180px] flex-1 text-[12px] font-medium text-slate-700">
        Registration number
        <input required minLength={4} maxLength={15} value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} placeholder="e.g. RJ14 PA 1234" className={inputCls} />
      </label>
      <label className="w-36 text-[12px] font-medium text-slate-700">
        AC
        <select value={form.acType} onChange={(e) => setForm({ ...form, acType: e.target.value as "AC" | "NON_AC" })} className={inputCls}>
          <option value="AC">AC</option>
          <option value="NON_AC">Non-AC</option>
        </select>
      </label>
      <label className="w-44 text-[12px] font-medium text-slate-700">
        Kind
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BusKind })} className={inputCls}>
          {BUS_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </label>
      <button disabled={busy || form.regNo.trim().length < 4} className="inline-flex items-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50">
        <Plus className="h-4 w-4" /> Add bus
      </button>
    </form>
  );
}

function BusRow({ bus }: { bus: Bus }) {
  const s = BUS_STATUS[bus.status];
  const problems = bus.paperProblems?.length ?? 0;
  return (
    <li>
      <Link href={`/business/buses/${bus.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-[#FE5300]/50">
        <BusFront className="h-5 w-5 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[13px] font-semibold text-slate-900">{bus.regNo}</span>
          <span className="block text-[12px] text-slate-500">{[bus.name, bus.acType === "AC" ? "AC" : "Non-AC", KIND_LABEL[bus.kind]].filter(Boolean).join(" · ")}</span>
        </span>
        {problems > 0 && bus.status !== "RETIRED" && <Pill tone="amber"><AlertTriangle className="h-3 w-3" /> {problems} paper{problems > 1 ? "s" : ""} to fix</Pill>}
        {!bus.layoutId && bus.status !== "RETIRED" && <Pill tone="amber">No seat layout</Pill>}
        <Pill tone={s.tone}>{s.label}</Pill>
      </Link>
    </li>
  );
}

function Buses({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const canRead = me.permissions.includes("bus-catalog.vehicle.read");
  const canManage = me.permissions.includes("bus-catalog.vehicle.manage") && !me.viewAs;
  const list = useQuery({ queryKey: ["b2b", "buses", token, me.currentOrgId], queryFn: () => b2b<{ data: Bus[] }>("/bus/vehicles"), enabled: canRead });
  if (!canRead) return <p className="text-[13px] text-slate-600">You don&apos;t have access to the buses of this company.</p>;
  const items = list.data?.data ?? [];
  const n = (v: number) => (list.isLoading ? "…" : v);
  const countOf = (...s: Bus["status"][]) => items.filter((b) => s.includes(b.status)).length;
  return (
    <div className="space-y-4">
      <PageHeader
        crumb="My Buses"
        title="My"
        highlight="Buses"
        subtitle="Add each bus with its seat layout and papers (RC, permit, insurance, fitness). MusafirBaba checks it before it can be sold."
        actions={<Link href="/business/buses/layouts" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700"><LayoutGrid className="h-4 w-4" /> Seat layouts</Link>}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={BusFront} label="Buses" value={n(items.filter((b) => b.status !== "RETIRED").length)} />
        <StatCard icon={CheckCircle2} tone="green" label="Approved" value={n(countOf("APPROVED"))} />
        <StatCard icon={Clock} tone="blue" label="Waiting for approval" value={n(countOf("SUBMITTED"))} />
        <StatCard icon={FilePen} tone="amber" label="Drafts / needs changes" value={n(countOf("DRAFT", "CHANGES_REQUESTED"))} />
      </div>
      {canManage && <NewBus />}
      {list.isLoading ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No buses yet. Make a seat layout first, then add your buses.</p>
      ) : (
        <ul className="space-y-2">{items.map((b) => <BusRow key={b.id} bus={b} />)}</ul>
      )}
    </div>
  );
}
