"use client";
// Cancellation policies of a property: list with the sentence guests read, add / change (version check), archive.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { problemList, type Penalty, type PenaltyType, type Policy } from "../../inventory";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import { inputCls, Labelled } from "../listing/ui";
import { fieldCls } from "./ui";
import { Panel, Pill } from "../portal/ui";

type Draft = { name: string; nonRefundable: boolean; rules: { hoursBefore: string; type: PenaltyType; value: string }[]; noShowType: PenaltyType; noShowValue: string };

const empty: Draft = { name: "", nonRefundable: false, rules: [{ hoursBefore: "48", type: "PERCENT", value: "50" }], noShowType: "PERCENT", noShowValue: "100" };
const UNIT: Record<PenaltyType, string> = { PERCENT: "% of the booking", NIGHTS: "night(s)", FIXED: "₹" };

/** Form value → API value (₹ → paise for fixed amounts). */
const toPenalty = (type: PenaltyType, value: string): Penalty => ({ type, value: type === "FIXED" ? Math.round(Number(value) * 100) : Number(value) });
const fromPenalty = (p: Penalty) => ({ type: p.type, value: String(p.type === "FIXED" ? p.value / 100 : p.value) });

function toDraft(p: Policy): Draft {
  const ns = fromPenalty(p.noShow);
  return { name: p.name, nonRefundable: p.nonRefundable, rules: p.rules.map((r) => ({ hoursBefore: String(r.hoursBefore), ...fromPenalty(r.penalty) })), noShowType: ns.type, noShowValue: ns.value };
}

function PenaltyInput({ type, value, onChange, disabled }: { type: PenaltyType; value: string; onChange: (t: PenaltyType, v: string) => void; disabled?: boolean }) {
  return (
    <span className="flex gap-1.5">
      <input className={`${fieldCls} w-24`} type="number" min={0} step={type === "FIXED" ? "0.01" : "1"} value={value} disabled={disabled} onChange={(e) => onChange(type, e.target.value)} />
      <select className={`${fieldCls} w-40`} value={type} disabled={disabled} onChange={(e) => onChange(e.target.value as PenaltyType, value)}>
        {(Object.keys(UNIT) as PenaltyType[]).map((t) => (
          <option key={t} value={t}>
            {UNIT[t]}
          </option>
        ))}
      </select>
    </span>
  );
}

function PolicyForm({ propertyId, editing, onDone }: { propertyId: string; editing: Policy | null; onDone: () => void }) {
  const [d, setD] = useState<Draft>(editing ? toDraft(editing) : empty);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const setRule = (i: number, patch: Partial<Draft["rules"][number]>) => setD({ ...d, rules: d.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblems([]);
    const body = {
      name: d.name,
      nonRefundable: d.nonRefundable,
      rules: d.nonRefundable ? [] : d.rules.map((r) => ({ hoursBefore: Number(r.hoursBefore), penalty: toPenalty(r.type, r.value) })),
      noShow: toPenalty(d.noShowType, d.noShowValue),
    };
    try {
      const url = `/hotel/properties/${propertyId}/cancellation-policies${editing ? `/${editing.id}` : ""}`;
      await b2b(url, { method: editing ? "PUT" : "POST", body, headers: editing ? { "If-Match": `"${editing.version}"` } : undefined });
      toast.success(editing ? "Policy saved" : "Policy added");
      onDone();
    } catch (err) {
      setProblems(problemList(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labelled label="Name">
          <input className={inputCls} required minLength={2} maxLength={60} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Flexible" />
        </Labelled>
        <label className="flex items-center gap-2 pt-5 text-[13px] text-slate-700">
          <input type="checkbox" checked={d.nonRefundable} onChange={(e) => setD({ ...d, nonRefundable: e.target.checked })} /> Non-refundable (cancelling always costs the full amount)
        </label>
      </div>
      {!d.nonRefundable && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Rules — cancelled less than … hours before check-in costs …</p>
          {d.rules.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span>Within</span>
              <input className={`${fieldCls} w-20`} type="number" min={0} max={8760} value={r.hoursBefore} onChange={(e) => setRule(i, { hoursBefore: e.target.value })} />
              <span>hours of check-in:</span>
              <PenaltyInput type={r.type} value={r.value} onChange={(type, value) => setRule(i, { type, value })} />
              <button type="button" aria-label="Remove rule" onClick={() => setD({ ...d, rules: d.rules.filter((_, j) => j !== i) })} className="p-1 text-slate-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {d.rules.length < 5 && (
            <button type="button" onClick={() => setD({ ...d, rules: [...d.rules, { hoursBefore: "24", type: "NIGHTS", value: "1" }] })} className="text-xs font-medium text-[#FE5300] hover:underline">
              + Add a rule
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span>No-show costs</span>
        <PenaltyInput type={d.noShowType} value={d.noShowValue} onChange={(t, v) => setD({ ...d, noShowType: t, noShowValue: v })} />
      </div>
      {problems.length > 0 && (
        <ul className="list-disc rounded-md bg-red-50 py-2 pl-6 pr-3 text-xs text-red-700">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-[#e54b00] disabled:opacity-50">
          {busy ? "Saving…" : "Save policy"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PoliciesPanel({ propertyId, canManage }: { propertyId: string; canManage: boolean }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const key = ["b2b", "policies", propertyId, token];
  const list = useQuery({ queryKey: key, queryFn: () => b2b<{ data: Policy[] }>(`/hotel/properties/${propertyId}/cancellation-policies`) });
  const [form, setForm] = useState<Policy | "new" | null>(null);
  const refresh = () => {
    setForm(null);
    void queryClient.invalidateQueries({ queryKey: ["b2b", "policies", propertyId] });
  };
  async function archive(p: Policy) {
    if (!window.confirm(`Archive "${p.name}"? Bookings already made keep their policy.`)) return;
    try {
      await b2b(`/hotel/properties/${propertyId}/cancellation-policies/${p.id}`, { method: "DELETE" });
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  const items = list.data?.data ?? [];
  return (
    <Panel
      icon={FileText}
      title="Cancellation policies"
      subtitle="Reusable rules your rate plans use. Guests see the sentence under each one."
      action={canManage && !form ? <button onClick={() => setForm("new")} className="inline-flex items-center gap-1 rounded-md bg-[#FE5300] px-2.5 py-1 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" /> Add policy</button> : undefined}
    >
      {form && <div className="mb-4"><PolicyForm key={form === "new" ? "new" : form.id} propertyId={propertyId} editing={form === "new" ? null : form} onDone={refresh} /></div>}
      {list.isLoading ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-slate-500">No policies yet. Add one before creating rate plans.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {p.name} {p.nonRefundable && <Pill tone="red">Non-refundable</Pill>}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{p.summary}</p>
              </div>
              {canManage && (
                <span className="flex gap-2">
                  <button onClick={() => setForm(p)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                  <button onClick={() => archive(p)} className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">Archive</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
