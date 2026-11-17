"use client";
// Rate plans of a property: what is sold (room types, meal plan, policy, pricing, booking window); a plan can follow
// another one's prices (+ ₹ or %). Add / change (version check), pause, archive.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { problemList, rupees, type Policy, type RatePlan } from "../../inventory";
import type { Masters, RoomType } from "../../listing";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import { inputCls, Labelled } from "../listing/ui";
import { fieldCls } from "./ui";
import { Panel, Pill } from "../portal/ui";

type Draft = {
  name: string;
  roomTypeIds: string[];
  mealPlanKey: string;
  cancellationPolicyId: string;
  pricingModel: RatePlan["pricingModel"];
  minAdvanceDays: string;
  maxAdvanceDays: string;
  follows: string;
  adjustType: "AMOUNT" | "PERCENT";
  adjustValue: string;
};

function toDraft(p: RatePlan | null, policies: Policy[], masters: Masters): Draft {
  if (!p) return { name: "", roomTypeIds: [], mealPlanKey: masters.mealPlans[0]?.key ?? "", cancellationPolicyId: policies[0]?.id ?? "", pricingModel: "PER_OCCUPANCY", minAdvanceDays: "0", maxAdvanceDays: "365", follows: "", adjustType: "AMOUNT", adjustValue: "" };
  const adj = p.derived?.adjust;
  return {
    name: p.name,
    roomTypeIds: p.roomTypeIds,
    mealPlanKey: p.mealPlanKey,
    cancellationPolicyId: p.cancellationPolicyId,
    pricingModel: p.pricingModel,
    minAdvanceDays: String(p.minAdvanceDays),
    maxAdvanceDays: String(p.maxAdvanceDays),
    follows: p.derived?.parentRatePlanId ?? "",
    adjustType: adj?.type ?? "AMOUNT",
    adjustValue: adj ? String(adj.type === "AMOUNT" ? adj.value / 100 : adj.value) : "",
  };
}

function PlanForm(props: { propertyId: string; editing: RatePlan | null; plans: RatePlan[]; rooms: RoomType[]; policies: Policy[]; masters: Masters; onDone: () => void }) {
  const { propertyId, editing, plans, rooms, policies, masters, onDone } = props;
  const [d, setD] = useState<Draft>(toDraft(editing, policies, masters));
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const parents = plans.filter((p) => !p.derived && p.id !== editing?.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblems([]);
    const body = {
      name: d.name,
      roomTypeIds: d.roomTypeIds,
      mealPlanKey: d.mealPlanKey,
      cancellationPolicyId: d.cancellationPolicyId,
      pricingModel: d.pricingModel,
      minAdvanceDays: Number(d.minAdvanceDays),
      maxAdvanceDays: Number(d.maxAdvanceDays),
      derived: d.follows ? { parentRatePlanId: d.follows, adjust: { type: d.adjustType, value: d.adjustType === "AMOUNT" ? Math.round(Number(d.adjustValue) * 100) : Number(d.adjustValue) } } : null,
    };
    try {
      const url = `/hotel/properties/${propertyId}/rate-plans${editing ? `/${editing.id}` : ""}`;
      await b2b(url, { method: editing ? "PUT" : "POST", body, headers: editing ? { "If-Match": `"${editing.version}"` } : undefined });
      toast.success(editing ? "Rate plan saved" : "Rate plan added");
      onDone();
    } catch (err) {
      setProblems(problemList(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const toggleRoom = (id: string, on: boolean) => setD({ ...d, roomTypeIds: on ? [...d.roomTypeIds, id] : d.roomTypeIds.filter((x) => x !== id) });
  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Labelled label="Name">
          <input className={inputCls} required minLength={2} maxLength={60} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Room only" />
        </Labelled>
        <Labelled label="Meal plan">
          <select className={inputCls} value={d.mealPlanKey} onChange={(e) => setD({ ...d, mealPlanKey: e.target.value })}>
            {masters.mealPlans.map((m) => (
              <option key={m.key} value={m.key}>{m.code} — {m.name}</option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Cancellation policy">
          <select className={inputCls} value={d.cancellationPolicyId} onChange={(e) => setD({ ...d, cancellationPolicyId: e.target.value })}>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Priced">
          <select className={inputCls} value={d.pricingModel} onChange={(e) => setD({ ...d, pricingModel: e.target.value as Draft["pricingModel"] })}>
            <option value="PER_OCCUPANCY">By number of guests</option>
            <option value="PER_ROOM">Per room (any number of guests)</option>
          </select>
        </Labelled>
        <Labelled label="Bookable from (days ahead)">
          <input className={inputCls} type="number" min={0} max={730} value={d.minAdvanceDays} onChange={(e) => setD({ ...d, minAdvanceDays: e.target.value })} />
        </Labelled>
        <Labelled label="Bookable until (days ahead)">
          <input className={inputCls} type="number" min={0} max={730} value={d.maxAdvanceDays} onChange={(e) => setD({ ...d, maxAdvanceDays: e.target.value })} />
        </Labelled>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600">Room types it sells</p>
        <div className="mt-1 flex flex-wrap gap-3">
          {rooms.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5 text-[13px] text-slate-700">
              <input type="checkbox" checked={d.roomTypeIds.includes(r.id)} onChange={(e) => toggleRoom(r.id, e.target.checked)} /> {r.name}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2 text-[13px]">
        <Labelled label="Prices">
          <select className={`${fieldCls} w-56`} value={d.follows} onChange={(e) => setD({ ...d, follows: e.target.value })}>
            <option value="">Its own prices (set in the calendar)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>Follow “{p.name}”</option>
            ))}
          </select>
        </Labelled>
        {d.follows && (
          <>
            <input className={`${fieldCls} w-24`} type="number" step="0.01" value={d.adjustValue} onChange={(e) => setD({ ...d, adjustValue: e.target.value })} placeholder="500" />
            <select className={`${fieldCls} w-32`} value={d.adjustType} onChange={(e) => setD({ ...d, adjustType: e.target.value as Draft["adjustType"] })}>
              <option value="AMOUNT">₹ more (− less)</option>
              <option value="PERCENT">% more (− less)</option>
            </select>
          </>
        )}
      </div>
      {problems.length > 0 && (
        <ul className="list-disc rounded-md bg-red-50 py-2 pl-6 pr-3 text-xs text-red-700">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-[#e54b00] disabled:opacity-50">{busy ? "Saving…" : "Save rate plan"}</button>
        <button type="button" onClick={onDone} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700">Cancel</button>
      </div>
    </form>
  );
}

export function RatePlansPanel({ propertyId, rooms, masters, canManage }: { propertyId: string; rooms: RoomType[]; masters: Masters; canManage: boolean }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ["b2b", "rate-plans", propertyId, token], queryFn: () => b2b<{ data: RatePlan[] }>(`/hotel/properties/${propertyId}/rate-plans`) });
  const policies = useQuery({ queryKey: ["b2b", "policies", propertyId, token], queryFn: () => b2b<{ data: Policy[] }>(`/hotel/properties/${propertyId}/cancellation-policies`) });
  const [form, setForm] = useState<RatePlan | "new" | null>(null);
  const refresh = () => {
    setForm(null);
    void queryClient.invalidateQueries({ queryKey: ["b2b", "rate-plans", propertyId] });
    void queryClient.invalidateQueries({ queryKey: ["b2b", "calendar", propertyId] });
  };
  async function act(p: RatePlan, action: "pause" | "resume" | "archive") {
    try {
      if (action === "archive") {
        if (!window.confirm(`Archive "${p.name}"? It stops selling; bookings already made are kept.`)) return;
        await b2b(`/hotel/properties/${propertyId}/rate-plans/${p.id}`, { method: "DELETE" });
      } else {
        const body = { name: p.name, roomTypeIds: p.roomTypeIds, mealPlanKey: p.mealPlanKey, cancellationPolicyId: p.cancellationPolicyId, pricingModel: p.pricingModel, minAdvanceDays: p.minAdvanceDays, maxAdvanceDays: p.maxAdvanceDays, derived: p.derived, status: action === "pause" ? "INACTIVE" : "ACTIVE" };
        await b2b(`/hotel/properties/${propertyId}/rate-plans/${p.id}`, { method: "PUT", body, headers: { "If-Match": `"${p.version}"` } });
      }
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  const list = plans.data?.data ?? [];
  const policyList = policies.data?.data ?? [];
  const nameOf = (id: string) => list.find((p) => p.id === id)?.name ?? "another plan";
  const meal = (key: string) => masters.mealPlans.find((m) => m.key === key)?.code ?? key;
  return (
    <Panel
      icon={Layers}
      title="Rate plans"
      subtitle="What you sell: room types, meals, cancellation policy and how it's priced."
      action={canManage && !form && policyList.length > 0 && rooms.length > 0 ? <button onClick={() => setForm("new")} className="inline-flex items-center gap-1 rounded-md bg-[#FE5300] px-2.5 py-1 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" /> Add rate plan</button> : undefined}
    >
      {policyList.length === 0 && <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Add a cancellation policy first — every rate plan needs one.</p>}
      {rooms.length === 0 && <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Add room types on the property page first.</p>}
      {form && <div className="mb-4"><PlanForm key={form === "new" ? "new" : form.id} propertyId={propertyId} editing={form === "new" ? null : form} plans={list} rooms={rooms} policies={policyList} masters={masters} onDone={refresh} /></div>}
      {plans.isLoading ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-slate-500">No rate plans yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {p.name} <Pill tone="blue">{meal(p.mealPlanKey)}</Pill> {p.status === "INACTIVE" && <Pill tone="amber">Paused</Pill>}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {p.roomTypeIds.map((id) => rooms.find((r) => r.id === id)?.name ?? "—").join(", ")} · {p.pricingModel === "PER_ROOM" ? "per room" : "by number of guests"} · {policyList.find((x) => x.id === p.cancellationPolicyId)?.name ?? "policy"}
                  {p.derived && ` · follows ${nameOf(p.derived.parentRatePlanId)} ${p.derived.adjust.type === "AMOUNT" ? `${p.derived.adjust.value >= 0 ? "+" : "−"}${rupees(Math.abs(p.derived.adjust.value))}` : `${p.derived.adjust.value >= 0 ? "+" : ""}${p.derived.adjust.value} %`}`}
                </p>
              </div>
              {canManage && (
                <span className="flex gap-2">
                  <button onClick={() => setForm(p)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                  <button onClick={() => act(p, p.status === "ACTIVE" ? "pause" : "resume")} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">{p.status === "ACTIVE" ? "Pause" : "Resume"}</button>
                  <button onClick={() => act(p, "archive")} className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">Archive</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
