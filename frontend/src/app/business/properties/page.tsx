"use client";
// The hotel's properties: list with status, and a new draft (name + type).
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, FilePen, Hotel } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, StatCard } from "@/b2b/components/portal/ui";
import { inputCls } from "@/b2b/components/listing/ui";
import { STATUS, type Masters, type Property } from "@/b2b/listing";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

export default function PropertiesPage() {
  return <BusinessShell>{(me) => <Properties me={me} />}</BusinessShell>;
}

function Properties({ me }: { me: Me }) {
  const router = useRouter();
  const token = useBusinessSession((s) => s.accessToken);
  const canRead = me.permissions.includes("hotel-catalog.property.read");
  const canManage = me.permissions.includes("hotel-catalog.property.manage") && !me.viewAs;
  const list = useQuery({ queryKey: ["b2b", "properties", token, me.currentOrgId], queryFn: () => b2b<{ data: Property[] }>("/hotel/properties"), enabled: canRead });
  const masters = useQuery({ queryKey: ["b2b", "masters"], queryFn: () => b2b<Masters>("/catalog/masters"), staleTime: 300_000 });
  const [form, setForm] = useState({ name: "", propertyTypeKey: "hotel" });
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await b2b<Property>("/hotel/properties", { method: "POST", body: form });
      router.push(`/business/properties/${p.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  if (!canRead) return <p className="text-sm text-slate-600">You don&apos;t have access to the properties of this organisation.</p>;
  const items = list.data?.data ?? [];
  const n = (v: number) => (list.isLoading ? "…" : v);
  const countOf = (...s: Property["status"][]) => items.filter((p) => s.includes(p.status)).length;
  return (
    <div className="space-y-6">
      <PageHeader crumb="My Properties" title="My" highlight="Properties" subtitle="Your hotel listings: details, rooms, photos and approval." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Hotel} label="Properties" value={n(items.length)} />
        <StatCard icon={CheckCircle2} tone="green" label="Live" value={n(countOf("LIVE"))} />
        <StatCard icon={Clock} tone="blue" label="Waiting for approval" value={n(countOf("SUBMITTED"))} />
        <StatCard icon={FilePen} tone="amber" label="Drafts / needs changes" value={n(countOf("DRAFT", "CHANGES_REQUESTED"))} />
      </div>
      {canManage && (
        <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="min-w-64 flex-1">
            <span className="text-sm font-medium text-slate-700">New property name</span>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} maxLength={120} />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select className={inputCls} value={form.propertyTypeKey} onChange={(e) => setForm({ ...form, propertyTypeKey: e.target.value })}>
              {(masters.data?.propertyTypes ?? [{ key: "hotel", name: "Hotel" }]).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy} className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Creating…" : "Create property"}
          </button>
        </form>
      )}
      {list.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No properties yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const cover = p.photos.find((x) => x.isCover) ?? p.photos[0];
            return (
              <Link key={p.id} href={`/business/properties/${p.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-sm">
                {cover ? (
                  <Image unoptimized src={(cover.sizes.card ?? cover.sizes.thumb)?.url ?? ""} width={640} height={400} alt={p.name} className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 text-xs text-slate-400">No photos yet</div>
                )}
                <div className="space-y-1 p-4">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.publicRef}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[p.status].tone}`}>{STATUS[p.status].label}</span>
                  {p.pendingRevision && <span className="ml-2 text-xs text-blue-700">changes pending</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
