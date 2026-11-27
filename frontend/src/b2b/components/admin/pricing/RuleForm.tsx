"use client";
// Writing or editing a margin rule (a DRAFT). Amounts are typed in rupees / percent and sent as paise / basis points.
// Saving never changes prices — the rule takes effect only after it is submitted and a second person approves it.
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../../messages";
import { CHANNEL_LABEL, CHANNELS, pricingProblems, type Adjustment, type Channel, type MarginRule } from "../../../pricing";
import { adminCall } from "../AdminPassGate";
import { fleetSelectClass, Input, inputSm, labelSm, Notice, PrimaryBtn, SecondaryBtn } from "../kit";

type City = { id: string; name: string };
const toRupees = (p: number | null | undefined) => (p === null || p === undefined ? "" : String(p / 100));
const toPaise = (r: string) => (r.trim() === "" ? null : Math.round(Number(r) * 100));

function initial(rule: MarginRule | null) {
  const a = rule?.adjustment;
  return {
    name: rule?.name ?? "",
    note: rule?.note ?? "",
    priority: String(rule?.priority ?? 10),
    channels: (rule?.match.channels ?? ["WEBSITE"]) as Channel[],
    allChannels: rule ? !rule.match.channels : false,
    productType: (rule?.match.productType ?? "HOTEL") as "HOTEL" | "BUS",
    operatorOrgId: rule?.match.operatorOrgId ?? "",
    routeId: rule?.match.routeId ?? "",
    cityId: rule?.match.cityId ?? "",
    starRating: rule?.match.starRating !== undefined ? String(rule.match.starRating) : "",
    clientCategory: rule?.match.clientCategory ?? "",
    stayFrom: rule?.match.stayFrom ?? "",
    stayTo: rule?.match.stayTo ?? "",
    type: (a?.type ?? "FIXED_PER_NIGHT") as Adjustment["type"],
    value: a ? (a.type === "PERCENT" ? String(a.value / 100) : toRupees(a.value)) : "",
    min: toRupees(a?.minPaise),
    max: toRupees(a?.maxPaise),
    allowBelowNet: rule?.allowBelowNet ?? false,
    effectiveFrom: rule?.effectiveFrom ? rule.effectiveFrom.slice(0, 10) : "",
    effectiveTo: rule?.effectiveTo ? rule.effectiveTo.slice(0, 10) : "",
    replaces: rule?.replaces ?? "",
  };
}

type Form = ReturnType<typeof initial>;

function bodyOf(f: Form) {
  const match: Record<string, unknown> = {};
  if (!f.allChannels) match.channels = f.channels;
  if (f.cityId) match.cityId = f.cityId;
  if (f.productType === "BUS") {
    match.productType = "BUS"; // Stage 18: a rule without a product is a hotel rule
    if (f.operatorOrgId.trim()) match.operatorOrgId = f.operatorOrgId.trim();
    if (f.routeId.trim()) match.routeId = f.routeId.trim();
  } else if (f.starRating !== "") match.starRating = Number(f.starRating);
  if (f.clientCategory.trim()) match.clientCategory = f.clientCategory.trim();
  if (f.stayFrom) match.stayFrom = f.stayFrom;
  if (f.stayTo) match.stayTo = f.stayTo;
  const value = f.type === "PERCENT" ? Math.round(Number(f.value) * 100) : Math.round(Number(f.value) * 100);
  return {
    name: f.name.trim(),
    note: f.note.trim() || null,
    priority: Number(f.priority),
    match,
    adjustment: { type: f.type, value, minPaise: f.type === "PERCENT" ? toPaise(f.min) : null, maxPaise: f.type === "PERCENT" ? toPaise(f.max) : null },
    allowBelowNet: f.allowBelowNet,
    effectiveFrom: f.effectiveFrom ? `${f.effectiveFrom}T00:00:00+05:30` : null,
    effectiveTo: f.effectiveTo ? `${f.effectiveTo}T00:00:00+05:30` : null,
    replaces: f.replaces || null,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelSm}>{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function RuleForm({ token, rule, active, cities, onSaved, onCancel }: { token: string; rule: MarginRule | null; active: MarginRule[]; cities: City[]; onSaved: (r: MarginRule) => void; onCancel: () => void }) {
  const [f, setF] = useState(() => initial(rule));
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Form>) => setF({ ...f, ...patch });

  async function save() {
    setBusy(true);
    setProblems([]);
    try {
      const r = rule
        ? await adminCall<MarginRule>(`/admin/margin-rules/${rule.id}`, token, { method: "PUT", body: bodyOf(f), headers: { "If-Match": `"${rule.version}"` } })
        : await adminCall<MarginRule>("/admin/margin-rules", token, { method: "POST", body: bodyOf(f) });
      toast.success("Saved as a draft — prices don't change until it's approved");
      onSaved(r);
    } catch (e) {
      setProblems(pricingProblems(e));
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name"><Input className={inputSm} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Goa New Year" /></Field>
        <Field label="Priority" hint="Higher wins; ties go to the more specific rule"><Input className={inputSm} type="number" value={f.priority} onChange={(e) => set({ priority: e.target.value })} /></Field>
        <Field label="Replaces (optional)" hint="Takes over from this rule when approved">
          <select className={fleetSelectClass} value={f.replaces} onChange={(e) => set({ replaces: e.target.value })}>
            <option value="">— nothing —</option>
            {active.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12px]">
        <span className={labelSm}>Channels</span>
        <label className="flex items-center gap-1"><input type="checkbox" checked={f.allChannels} onChange={(e) => set({ allChannels: e.target.checked })} /> all</label>
        {!f.allChannels && CHANNELS.map((c) => (
          <label key={c} className="flex items-center gap-1">
            <input type="checkbox" checked={f.channels.includes(c)} onChange={(e) => set({ channels: e.target.checked ? [...f.channels, c] : f.channels.filter((x) => x !== c) })} /> {CHANNEL_LABEL[c]}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Product">
          <select className={fleetSelectClass} value={f.productType} onChange={(e) => set({ productType: e.target.value as "HOTEL" | "BUS" })}>
            <option value="HOTEL">Hotels</option>
            <option value="BUS">Buses (per seat)</option>
          </select>
        </Field>
        {f.productType === "BUS" && <Field label="Bus company id (optional)"><Input className={inputSm} value={f.operatorOrgId} onChange={(e) => set({ operatorOrgId: e.target.value })} placeholder="any" /></Field>}
        {f.productType === "BUS" && <Field label="Route id (optional)"><Input className={inputSm} value={f.routeId} onChange={(e) => set({ routeId: e.target.value })} placeholder="any" /></Field>}
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label="City">
          <select className={fleetSelectClass} value={f.cityId} onChange={(e) => set({ cityId: e.target.value })}>
            <option value="">Any</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {f.productType === "HOTEL" ? <Field label="Stars"><Input className={inputSm} type="number" min={0} max={5} value={f.starRating} onChange={(e) => set({ starRating: e.target.value })} placeholder="any" /></Field> : <span />}
        <Field label="Client category"><Input className={inputSm} value={f.clientCategory} onChange={(e) => set({ clientCategory: e.target.value })} placeholder="any (e.g. GOLD)" /></Field>
        <Field label="Stays from"><Input className={inputSm} type="date" value={f.stayFrom} onChange={(e) => set({ stayFrom: e.target.value })} /></Field>
        <Field label="Stays until (incl.)"><Input className={inputSm} type="date" value={f.stayTo} onChange={(e) => set({ stayTo: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label="Margin type">
          <select className={fleetSelectClass} value={f.type} onChange={(e) => set({ type: e.target.value as Adjustment["type"] })}>
            <option value="FIXED_PER_NIGHT">{f.productType === "BUS" ? "₹ per seat" : "₹ per room per night"}</option>
            <option value="PERCENT">{f.productType === "BUS" ? "% of the operator fare" : "% of hotel rate"}</option>
            <option value="FIXED_PER_BOOKING">₹ per booking (added once)</option>
          </select>
        </Field>
        <Field label={f.type === "PERCENT" ? "Percent" : "Amount (₹)"}><Input className={inputSm} type="number" step="0.01" value={f.value} onChange={(e) => set({ value: e.target.value })} /></Field>
        {f.type === "PERCENT" && <Field label="Min ₹ (optional)"><Input className={inputSm} type="number" value={f.min} onChange={(e) => set({ min: e.target.value })} /></Field>}
        {f.type === "PERCENT" && <Field label="Max ₹ (optional)"><Input className={inputSm} type="number" value={f.max} onChange={(e) => set({ max: e.target.value })} /></Field>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="In force from (optional)"><Input className={inputSm} type="date" value={f.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} /></Field>
        <Field label="In force until (optional)"><Input className={inputSm} type="date" value={f.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} /></Field>
        <Field label="Note"><Input className={inputSm} value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="why this rule" /></Field>
      </div>
      <label className="flex items-center gap-1.5 text-[12px] text-slate-700">
        <input type="checkbox" checked={f.allowBelowNet} onChange={(e) => set({ allowBelowNet: e.target.checked })} /> Allow selling below the hotel&apos;s rate (negative margin)
      </label>
      {problems.length > 0 && <Notice tone="red"><ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>}
      <div className="flex gap-2">
        <PrimaryBtn disabled={busy || f.name.trim().length < 3 || f.value === ""} onClick={save}>{busy ? "Saving…" : "Save draft"}</PrimaryBtn>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
      </div>
    </div>
  );
}
