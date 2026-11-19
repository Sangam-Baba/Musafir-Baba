"use client";
// My markup (B2B dashboard, Stage 12 part A): the client's own markup for its customers — a default plus overrides by
// city, hotel or star rating. Shown as "my selling price" beside the B2B price; MusafirBaba never charges it.
// The Owner changes it (`pricing.markup.manage`); agents see it.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import type { Me } from "@/b2b/types";

type Adjustment = { type: "PERCENT" | "FIXED_PER_NIGHT" | "FIXED_PER_BOOKING"; value: number; minPaise: number | null; maxPaise: number | null };
type Override = { match: { cityId?: string; propertyId?: string; starRating?: number }; adjustment: Adjustment };
type Markup = { enabled: boolean; adjustment: Adjustment; overrides: Override[]; version: number };
type City = { id: string; name: string };

const input = "h-9 rounded-lg border border-slate-200 bg-white px-2 text-[13px]";
const TYPE_LABEL: Record<Adjustment["type"], string> = { PERCENT: "% of my price per room-night", FIXED_PER_NIGHT: "₹ per room per night", FIXED_PER_BOOKING: "₹ per booking" };
/** What the person types (percent or rupees) ↔ what the API stores (basis points or paise). */
const toShown = (a: Adjustment) => String(a.value / 100);
const fromShown = (type: Adjustment["type"], v: string): Adjustment => ({ type, value: Math.max(0, Math.round(Number(v || 0) * 100)), minPaise: null, maxPaise: null });

function AdjustmentFields({ a, onChange, disabled }: { a: Adjustment; onChange: (a: Adjustment) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={input} value={a.type} disabled={disabled} onChange={(e) => onChange({ ...a, type: e.target.value as Adjustment["type"] })}>
        {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input className={`${input} w-28`} type="number" min={0} step="0.01" value={toShown(a)} disabled={disabled} onChange={(e) => onChange(fromShown(a.type, e.target.value))} />
    </div>
  );
}

function MarkupForm({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const canEdit = me.permissions.includes("pricing.markup.manage") && !me.viewAs;
  const markup = useQuery({ queryKey: ["b2b", "markup", me.currentOrgId], queryFn: () => b2b<Markup>("/markups") });
  const cities = useQuery({ queryKey: ["b2b", "catalog-masters"], queryFn: () => b2b<{ cities: City[] }>("/catalog/masters") });
  const [v, setV] = useState<Markup | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (markup.data) setV(markup.data);
  }, [markup.data]);
  if (!v) return <p className="text-[13px] text-slate-500">Loading…</p>;
  const setOverride = (i: number, o: Override) => setV({ ...v, overrides: v.overrides.map((x, n) => (n === i ? o : x)) });

  async function save() {
    if (!v) return;
    setBusy(true);
    try {
      await b2b("/markups", { method: "PUT", body: { enabled: v.enabled, adjustment: v.adjustment, overrides: v.overrides }, headers: { "If-Match": `"${v.version}"` } });
      toast.success("Markup saved — your selling prices update within a few seconds");
      await queryClient.invalidateQueries({ queryKey: ["b2b", "markup"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-[13px]">
      <label className="flex items-center gap-2 font-medium text-slate-800">
        <input type="checkbox" checked={v.enabled} disabled={!canEdit} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> Show my selling price
      </label>
      <div className="space-y-1.5">
        <p className="font-medium text-slate-800">Default markup</p>
        <AdjustmentFields a={v.adjustment} disabled={!canEdit} onChange={(a) => setV({ ...v, adjustment: a })} />
      </div>
      <div className="space-y-2">
        <p className="font-medium text-slate-800">Exceptions <span className="font-normal text-slate-500">— the most specific one wins (hotel, then city, then stars)</span></p>
        {v.overrides.map((o, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
            <select className={input} value={o.match.cityId ?? ""} disabled={!canEdit} onChange={(e) => setOverride(i, { ...o, match: { ...o.match, cityId: e.target.value || undefined } })}>
              <option value="">Any city</option>
              {(cities.data?.cities ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={input} value={o.match.starRating ?? ""} disabled={!canEdit} onChange={(e) => setOverride(i, { ...o, match: { ...o.match, starRating: e.target.value === "" ? undefined : Number(e.target.value) } })}>
              <option value="">Any stars</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★</option>)}
            </select>
            <AdjustmentFields a={o.adjustment} disabled={!canEdit} onChange={(a) => setOverride(i, { ...o, adjustment: a })} />
            {canEdit && <button type="button" className="text-red-600" onClick={() => setV({ ...v, overrides: v.overrides.filter((_, n) => n !== i) })} aria-label="Remove"><Trash2 size={15} /></button>}
          </div>
        ))}
        {canEdit && v.overrides.length < 20 && (
          <button type="button" className="inline-flex items-center gap-1 text-[#FE5300]" onClick={() => setV({ ...v, overrides: [...v.overrides, { match: {}, adjustment: { type: "PERCENT", value: 1000, minPaise: null, maxPaise: null } }] })}>
            <Plus size={14} /> Add an exception
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">Your selling price is shown only to your team, beside the B2B price. MusafirBaba never charges it — what you pay is always the B2B price incl. GST.</p>
      {canEdit ? (
        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-[#FE5300] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save markup"}</button>
      ) : (
        <p className="text-xs text-slate-500">Only your company&apos;s owner can change the markup.</p>
      )}
    </div>
  );
}

export default function MarkupPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("pricing.markup.read") ? (
          <div className="space-y-4">
            <PageHeader title="My" highlight="markup" subtitle="What you add on top of your B2B price when you sell to your customers." />
            <MarkupForm me={me} />
          </div>
        ) : (
          <p className="text-[13px] text-slate-600">This page is for B2B client companies.</p>
        )
      }
    </BusinessShell>
  );
}
