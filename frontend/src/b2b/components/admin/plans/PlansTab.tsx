"use client";
// B2B admin → Plans & billing (Stage 13): the plan catalogue and what counts, every client's subscription by use,
// overrides and query top-ups (two people), the dunning board, and revenue.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, IndianRupee, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";
import { PlanCatalogue, QueryWeights } from "./PlanCatalogue";

type SubRow = { clientOrgId: string; name: string; planName: string; status: string; used: number; allowance: number; percent: number; overridden: boolean };
type Override = { id: string; clientOrgId: string; kind: "OVERRIDE" | "TOPUP"; queries: number; reason: string; status: string; proposedBy: string };
type Dunning = { clientOrgId: string; status: string; unpaidPaise: number; invoices: string[]; steps: number[] };
type Revenue = { month: string; mrrPaise: number; activeClients: number; invoicedPaise: number; paidPaise: number; unpaidPaise: number; overagePaise: number };

function Subscriptions({ token }: { token: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["b2b-admin", "plans", "subs"], queryFn: () => adminCall<{ data: SubRow[] }>("/admin/subscriptions", token), retry: false });
  const pending = useQuery({ queryKey: ["b2b-admin", "plans", "overrides"], queryFn: () => adminCall<{ data: Override[] }>("/admin/overrides?status=PROPOSED", token), retry: false });
  const [topUp, setTopUp] = useState<{ org: string; queries: string; reason: string } | null>(null);
  async function act(path: string, body: unknown, done: string) {
    try {
      await adminCall(path, token, { method: "POST", body });
      toast.success(done);
      setTopUp(null);
      void qc.invalidateQueries({ queryKey: ["b2b-admin", "plans"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <FleetPanel title="Client subscriptions" description="Most used first. Give a query top-up (a second person approves)." icon={Users} bodyClassName="p-0">
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {q.data?.data.length === 0 && <FleetEmptyState icon={Users} title="No subscriptions yet" />}
      {q.data?.data.map((s) => (
        <div key={s.clientOrgId} className="border-t border-slate-100 px-4 py-2 text-[13px] first:border-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{s.name}</span>
            <span className="text-slate-600">{s.planName}</span>
            <FleetPill className={s.status === "ACTIVE" || s.status === "TRIAL" ? fleetTone.emerald : fleetTone.red}>{s.status}</FleetPill>
            {s.overridden && <FleetPill className={fleetTone.violet}>custom</FleetPill>}
            <span className={`ml-auto font-semibold ${s.percent >= 100 ? "text-red-700" : s.percent >= 80 ? "text-amber-700" : "text-slate-900"}`}>{s.percent}%</span>
            <span className="w-36 text-right text-slate-500">{s.used.toLocaleString("en-IN")} / {s.allowance.toLocaleString("en-IN")}</span>
            <SecondaryBtn onClick={() => setTopUp({ org: s.clientOrgId, queries: "1000", reason: "" })}>Top-up</SecondaryBtn>
          </div>
          {topUp?.org === s.clientOrgId && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Input className={`${inputSm} w-28`} value={topUp.queries} onChange={(e) => setTopUp({ ...topUp, queries: e.target.value })} />
              <Input className={`${inputSm} w-64`} placeholder="Why" value={topUp.reason} onChange={(e) => setTopUp({ ...topUp, reason: e.target.value })} />
              <PrimaryBtn disabled={topUp.reason.trim().length < 3 || !(Number(topUp.queries) > 0)} onClick={() => act("/admin/overrides", { clientOrgId: s.clientOrgId, kind: "TOPUP", queries: Number(topUp.queries), reason: topUp.reason.trim() }, "Proposed — another person approves")}>Propose</PrimaryBtn>
            </div>
          )}
        </div>
      ))}
      {(pending.data?.data ?? []).map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-2 border-t border-amber-100 bg-amber-50/50 px-4 py-2 text-[13px]">
          <span>{o.kind === "TOPUP" ? `+${o.queries.toLocaleString("en-IN")} queries` : "Custom terms"} for {o.clientOrgId.slice(-6)} · {o.reason} · by {o.proposedBy}</span>
          <span className="ml-auto flex gap-1.5">
            <PrimaryBtn onClick={() => act(`/admin/overrides/${o.id}/decide`, { approve: true }, "Approved")}>Approve</PrimaryBtn>
            <SecondaryBtn onClick={() => act(`/admin/overrides/${o.id}/decide`, { approve: false }, "Rejected")}>Reject</SecondaryBtn>
          </span>
        </div>
      ))}
    </FleetPanel>
  );
}

function DunningAndRevenue({ token }: { token: string }) {
  const d = useQuery({ queryKey: ["b2b-admin", "plans", "dunning"], queryFn: () => adminCall<{ data: Dunning[] }>("/admin/dunning", token), retry: false });
  const r = useQuery({ queryKey: ["b2b-admin", "plans", "revenue"], queryFn: () => adminCall<Revenue>("/admin/billing/revenue", token), retry: false });
  return (
    <>
      <FleetPanel title="Revenue (this month)" description="Plans and usage, before GST." icon={IndianRupee} bodyClassName="p-4">
        {r.data && (
          <div className="grid gap-3 text-[13px] sm:grid-cols-3 lg:grid-cols-6">
            {[["MRR", inr(r.data.mrrPaise)], ["Paying clients", String(r.data.activeClients)], ["Invoiced", inr(r.data.invoicedPaise)], ["Paid", inr(r.data.paidPaise)], ["Unpaid", inr(r.data.unpaidPaise)], ["Overage", inr(r.data.overagePaise)]].map(([k, v]) => (
              <div key={k}><p className="text-[12px] text-slate-500">{k}</p><p className="font-semibold text-slate-900">{v}</p></div>
            ))}
          </div>
        )}
      </FleetPanel>
      <FleetPanel title="Unpaid (dunning)" description="Reminders on day 0, 3, 7; paused on day 10; back on as soon as it is paid." icon={AlarmClock} bodyClassName="p-0">
        {d.data?.data.length === 0 && <FleetEmptyState icon={AlarmClock} title="Nobody owes anything" />}
        {d.data?.data.map((x) => (
          <p key={x.clientOrgId} className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2 text-[13px] first:border-0">
            <span className="font-mono text-[12px]">{x.clientOrgId.slice(-6)}</span>
            <FleetPill className={x.status === "SUSPENDED" ? fleetTone.red : fleetTone.amber}>{x.status}</FleetPill>
            <span className="text-slate-600">{x.invoices.join(", ")} · reminders {x.steps.filter((s) => s < 10).map((s) => `day ${s}`).join(", ") || "—"}</span>
            <span className="ml-auto font-semibold">{inr(x.unpaidPaise)}</span>
          </p>
        ))}
      </FleetPanel>
    </>
  );
}

const SECTIONS = [
  { key: "plans", label: "Plans" },
  { key: "clients", label: "Clients" },
  { key: "money", label: "Revenue & dunning" },
] as const;

export function PlansTab({ token }: { token: string }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("plans");
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`rounded-md border px-3 py-1 text-[12px] ${section === s.key ? "border-[#FE5300] bg-orange-50 font-medium text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>{s.label}</button>
        ))}
      </div>
      {section === "plans" && (
        <>
          <PlanCatalogue token={token} />
          <QueryWeights token={token} />
        </>
      )}
      {section === "clients" && <Subscriptions token={token} />}
      {section === "money" && <DunningAndRevenue token={token} />}
    </div>
  );
}
