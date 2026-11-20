"use client";
// Pricing → Margin rules: every rule with what it covers and adds; a rule's page with its history, a price preview
// (₹700 sample, website + B2B, with this rule as if approved), how many live hotels it covers, and the next step:
// draft → submit → a second person approves (or sends back with a reason) → in force → retire.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Percent } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { rupees } from "../../../inventory";
import { errorMessage } from "../../../messages";
import { adjustmentText, matchText, STATUS_LABEL, type MarginRule, type RuleStatus, type SimResult } from "../../../pricing";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";
import { RuleForm } from "./RuleForm";

type City = { id: string; name: string };
const TONE: Record<RuleStatus, string> = { DRAFT: fleetTone.slate, PENDING_APPROVAL: fleetTone.amber, ACTIVE: fleetTone.emerald, RETIRED: fleetTone.slate };
const FILTERS: (RuleStatus | "")[] = ["", "ACTIVE", "PENDING_APPROVAL", "DRAFT", "RETIRED"];

function Preview({ token, rule }: { token: string; rule: MarginRule }) {
  const [base, setBase] = useState("700");
  const drafts = rule.status === "DRAFT" || rule.status === "PENDING_APPROVAL" ? [rule.id] : [];
  const q = useQuery({
    queryKey: ["b2b-admin", "pricing", "preview", rule.id, rule.version, base],
    enabled: Number(base) > 0,
    queryFn: async () =>
      Promise.all(
        (["WEBSITE", "B2B_PORTAL"] as const).map((channel) =>
          adminCall<{ results: SimResult[] }>("/admin/pricing/simulate", token, {
            method: "POST",
            body: { channel, draftRuleIds: drafts, sample: { netPaise: Math.round(Number(base) * 100), date: rule.match.stayFrom ?? new Date().toISOString().slice(0, 10), stateCode: "07", cityId: rule.match.cityId ?? null, starRating: rule.match.starRating ?? null } },
          }),
        ),
      ),
  });
  const show = (r: SimResult | undefined) => (!r ? "…" : r.ok ? `${rupees(r.breakdown.totals.totalPaise)}${r.breakdown.ruleIds.includes(rule.id) ? "" : " (another rule)"}` : "not sellable");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
      <span>Hotel rate ₹</span>
      <Input className={`${inputSm} w-24`} type="number" value={base} onChange={(e) => setBase(e.target.value)} />
      <span>→ Website <strong>{show(q.data?.[0]?.results[0])}</strong>, B2B <strong>{show(q.data?.[1]?.results[0])}</strong> per night incl. GST</span>
      <span className="text-slate-400">(Delhi hotel{drafts.length ? ", this rule as if approved" : ""})</span>
    </div>
  );
}

function RuleDetail({ token, rule, cities, onEdit, onChanged }: { token: string; rule: MarginRule; cities: City[]; onEdit: () => void; onChanged: (r: MarginRule) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const detail = useQuery({ queryKey: ["b2b-admin", "pricing", "rule", rule.id, rule.version], queryFn: () => adminCall<MarginRule>(`/admin/margin-rules/${rule.id}`, token) });
  const reach = useQuery({ queryKey: ["b2b-admin", "pricing", "reach", rule.id, rule.version], queryFn: () => adminCall<{ count: number; capped: boolean }>(`/admin/margin-rules/${rule.id}/reach`, token) });
  const city = (id: string) => cities.find((c) => c.id === id)?.name ?? "a city";
  async function act(action: string, needsNote = false) {
    if (needsNote && note.trim().length < 5) return toast.error("Write a short reason first (at least 5 characters)");
    setBusy(true);
    try {
      const r = await adminCall<MarginRule>(`/admin/margin-rules/${rule.id}/${action}`, token, { method: "POST", body: { note: note.trim() || null }, headers: { "If-Match": `"${rule.version}"` } });
      toast.success({ submit: "Sent for approval", approve: "Approved — in force now", reject: "Sent back", retire: "Retired", discard: "Discarded" }[action] ?? "Done");
      setNote("");
      onChanged(r);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const s = rule.status;
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <FleetPill className={TONE[s]}>{STATUS_LABEL[s]}</FleetPill>
        <span className="font-medium text-slate-900">{adjustmentText(rule.adjustment)}</span>
        <span className="text-slate-500">{matchText(rule.match, city)} · priority {rule.priority}</span>
        {reach.data && <span className="text-slate-500">· covers {reach.data.count}{reach.data.capped ? "+" : ""} live propert{reach.data.count === 1 ? "y" : "ies"}</span>}
      </div>
      <Preview token={token} rule={rule} />
      {s !== "RETIRED" && (
        <div className="flex flex-wrap items-center gap-2">
          {(s === "PENDING_APPROVAL" || s === "ACTIVE") && <Input className={`${inputSm} w-72`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={s === "ACTIVE" ? "Reason to retire" : "Note (reason required to send back)"} />}
          {s === "DRAFT" && <SecondaryBtn onClick={onEdit}>Edit</SecondaryBtn>}
          {s === "DRAFT" && <PrimaryBtn disabled={busy} onClick={() => act("submit")}>Submit for approval</PrimaryBtn>}
          {s === "DRAFT" && <SecondaryBtn danger disabled={busy} onClick={() => act("discard")}>Discard</SecondaryBtn>}
          {s === "PENDING_APPROVAL" && <PrimaryBtn disabled={busy} onClick={() => act("approve")}>Approve</PrimaryBtn>}
          {s === "PENDING_APPROVAL" && <SecondaryBtn disabled={busy} onClick={() => act("reject", true)}>Send back</SecondaryBtn>}
          {s === "ACTIVE" && <SecondaryBtn danger disabled={busy} onClick={() => act("retire", true)}>Retire</SecondaryBtn>}
          {s === "PENDING_APPROVAL" && <span className="text-[11px] text-slate-500">Approved by someone other than the person who wrote or submitted it.</span>}
        </div>
      )}
      <ol className="space-y-0.5 border-l border-slate-200 pl-3 text-[11px] text-slate-600">
        {(detail.data?.history ?? []).map((h, i) => (
          <li key={i}>
            {new Date(h.at).toLocaleString("en-IN")} · <strong>{h.action}</strong> by {h.by}
            {h.note ? ` — ${h.note}` : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MarginRules({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RuleStatus | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<MarginRule | "new" | null>(null);
  const rules = useQuery({ queryKey: ["b2b-admin", "pricing", "rules"], queryFn: () => adminCall<{ data: MarginRule[] }>("/admin/margin-rules", token) });
  const masters = useQuery({ queryKey: ["b2b-admin", "catalog-masters"], queryFn: () => adminCall<{ cities: City[] }>("/catalog/masters", token) });
  const cities = masters.data?.cities ?? [];
  const all = rules.data?.data ?? [];
  const shown = filter ? all.filter((r) => r.status === filter) : all;
  const refresh = (r: MarginRule) => {
    setOpen(r.id);
    setEditing(null);
    void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "pricing"] });
  };
  const city = (id: string) => cities.find((c) => c.id === id)?.name ?? "a city";
  return (
    <FleetPanel
      title="Margin rules"
      description="Price shown = hotel rate + margin (by channel) + GST. A rule takes effect only after a second person approves it; existing bookings never change."
      icon={Percent}
      actions={<PrimaryBtn onClick={() => setEditing("new")}>New rule</PrimaryBtn>}
      bodyClassName="p-0"
    >
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
        {FILTERS.map((f) => (
          <button key={f || "all"} onClick={() => setFilter(f)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${filter === f ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>
            {f ? STATUS_LABEL[f] : "All"} ({f ? all.filter((r) => r.status === f).length : all.length})
          </button>
        ))}
      </div>
      {editing === "new" && <RuleForm token={token} rule={null} active={all.filter((r) => r.status === "ACTIVE")} cities={cities} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {rules.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>}
      {!rules.isLoading && shown.length === 0 && <FleetEmptyState icon={Percent} title="No rules here" />}
      <div className="divide-y divide-slate-100">
        {shown.map((r) => (
          <div key={r.id}>
            <button className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-[13px] hover:bg-slate-50" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <FleetPill className={TONE[r.status]}>{STATUS_LABEL[r.status]}</FleetPill>
              <span className="font-medium text-slate-900">{r.name}</span>
              <span className="text-slate-500">{matchText(r.match, city)}</span>
              <span className="flex-1" />
              <span className="font-medium text-slate-800">{adjustmentText(r.adjustment)}</span>
              <span className="w-16 text-right text-[11px] text-slate-500">prio {r.priority}</span>
            </button>
            {open === r.id &&
              (editing && editing !== "new" && editing.id === r.id ? (
                <RuleForm token={token} rule={r} active={all.filter((x) => x.status === "ACTIVE" && x.id !== r.id)} cities={cities} onSaved={refresh} onCancel={() => setEditing(null)} />
              ) : (
                <RuleDetail token={token} rule={r} cities={cities} onEdit={() => setEditing(r)} onChanged={refresh} />
              ))}
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}
