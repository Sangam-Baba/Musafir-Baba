"use client";
// B2B admin → Plans (Stage 13): plan versions (draft → a different person publishes / rejects), retire, and the
// "what counts as a query" table. Numbers are placeholders until the business signs off D7.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { rupeesToPaise } from "../../../finance";
import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

type Version = { id: string; key: string; version: number; status: string; name: string; monthlyQueryLimit: number; pricePaise: number; limitBehaviour: "BLOCK" | "OVERAGE"; overagePricePerQueryPaise: number; trialDays: number; features: { users: number; branches: number; api: boolean; webhooks: boolean }; proposedBy: string };
const TONE: Record<string, string> = { PUBLISHED: fleetTone.emerald, DRAFT: fleetTone.amber, SUPERSEDED: fleetTone.slate, REJECTED: fleetTone.red, RETIRED: fleetTone.slate };

function useAct(token: string) {
  const qc = useQueryClient();
  return async (path: string, method: string, body: unknown, done: string) => {
    try {
      await adminCall(path, token, { method, body });
      toast.success(done);
      void qc.invalidateQueries({ queryKey: ["b2b-admin", "plans"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
}

function DraftForm({ token, from, onDone }: { token: string; from: Version | null; onDone: () => void }) {
  const act = useAct(token);
  const [f, setF] = useState({ key: from?.key ?? "", name: from?.name ?? "", limit: String(from?.monthlyQueryLimit ?? 4000), price: String((from?.pricePaise ?? 0) / 100), behaviour: from?.limitBehaviour ?? "BLOCK", overage: String((from?.overagePricePerQueryPaise ?? 0) / 100), users: String(from?.features.users ?? 5), branches: String(from?.features.branches ?? 2), api: from?.features.api ?? false });
  const body = { name: f.name.trim(), monthlyQueryLimit: Number(f.limit), pricePaise: rupeesToPaise(f.price) ?? -1, limitBehaviour: f.behaviour, overagePricePerQueryPaise: rupeesToPaise(f.overage) ?? -1, trialDays: from?.trialDays ?? 0, features: { users: Number(f.users), branches: Number(f.branches), api: f.api, webhooks: from?.features.webhooks ?? false } };
  return (
    <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[13px] sm:grid-cols-4">
      <label>Plan key<Input className={inputSm} disabled={Boolean(from)} value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toUpperCase() })} placeholder="A" /></label>
      <label>Name<Input className={inputSm} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Queries / month<Input className={inputSm} value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></label>
      <label>Price ₹ / month<Input className={inputSm} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
      <label>At the limit<select className="h-8 w-full rounded-md border border-slate-200 px-2" value={f.behaviour} onChange={(e) => setF({ ...f, behaviour: e.target.value as "BLOCK" | "OVERAGE" })}><option value="BLOCK">Block</option><option value="OVERAGE">Charge per extra query</option></select></label>
      <label>₹ per extra query<Input className={inputSm} disabled={f.behaviour === "BLOCK"} value={f.overage} onChange={(e) => setF({ ...f, overage: e.target.value })} /></label>
      <label>Users<Input className={inputSm} value={f.users} onChange={(e) => setF({ ...f, users: e.target.value })} /></label>
      <label>Branches<Input className={inputSm} value={f.branches} onChange={(e) => setF({ ...f, branches: e.target.value })} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.api} onChange={(e) => setF({ ...f, api: e.target.checked })} /> API access</label>
      <div className="flex items-end gap-2 sm:col-span-3">
        <PrimaryBtn disabled={!/^[A-Z0-9_]{1,20}$/.test(f.key) || f.name.trim().length < 2} onClick={() => act(`/admin/plans/${f.key}/versions`, "POST", body, "Draft saved — another person publishes it").then(onDone)}>Save draft</PrimaryBtn>
        <SecondaryBtn onClick={onDone}>Close</SecondaryBtn>
      </div>
    </div>
  );
}

export function PlanCatalogue({ token }: { token: string }) {
  const act = useAct(token);
  const q = useQuery({ queryKey: ["b2b-admin", "plans", "all"], queryFn: () => adminCall<{ data: Version[] }>("/admin/plans", token), retry: false });
  const [editing, setEditing] = useState<Version | "new" | null>(null);
  const rows = (q.data?.data ?? []).filter((v) => ["PUBLISHED", "DRAFT", "RETIRED"].includes(v.status));
  return (
    <FleetPanel title="Plans" description="Changes are saved as a draft; a different person publishes it. Clients move to a new price at their next renewal." icon={Layers} bodyClassName="p-0">
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {rows.map((v) => (
        <div key={v.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-[13px] first:border-0">
          <span className="font-mono text-[12px] text-slate-500">{v.key} v{v.version}</span>
          <span className="font-medium text-slate-900">{v.name}</span>
          <FleetPill className={TONE[v.status] ?? fleetTone.slate}>{v.status}</FleetPill>
          <span className="text-slate-600">{v.monthlyQueryLimit.toLocaleString("en-IN")} queries · {v.pricePaise ? `${inr(v.pricePaise)}/mo` : "free"} · {v.limitBehaviour === "OVERAGE" ? `${inr(v.overagePricePerQueryPaise)}/extra` : "blocks"}</span>
          <span className="ml-auto flex gap-1.5">
            {v.status === "DRAFT" ? (
              <>
                <span className="self-center text-[12px] text-slate-500">by {v.proposedBy}</span>
                <PrimaryBtn onClick={() => act(`/admin/plans/versions/${v.id}/decide`, "POST", { approve: true }, "Published")}>Publish</PrimaryBtn>
                <SecondaryBtn onClick={() => act(`/admin/plans/versions/${v.id}/decide`, "POST", { approve: false }, "Rejected")}>Reject</SecondaryBtn>
              </>
            ) : v.status === "PUBLISHED" ? (
              <>
                <SecondaryBtn onClick={() => setEditing(v)}>New version</SecondaryBtn>
                <SecondaryBtn onClick={() => window.confirm(`Retire ${v.name}? Clients on it keep it until they change.`) && act(`/admin/plans/${v.key}/retire`, "POST", {}, "Retired")}>Retire</SecondaryBtn>
              </>
            ) : null}
          </span>
        </div>
      ))}
      {editing ? <DraftForm token={token} from={editing === "new" ? null : editing} onDone={() => setEditing(null)} /> : <div className="border-t border-slate-100 px-4 py-2"><SecondaryBtn onClick={() => setEditing("new")}>New plan</SecondaryBtn></div>}
    </FleetPanel>
  );
}

export function QueryWeights({ token }: { token: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["b2b-admin", "plans", "weights"], queryFn: () => adminCall<Record<string, number>>("/admin/query-weights", token), retry: false });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const LABEL: Record<string, string> = { "hotel.search": "Hotel search", "hotel.offers": "Rooms & prices (hotel page)", "hotel.pricecheck": "Price check", "hotel.order": "Create booking" };
  const values = draft ?? Object.fromEntries(Object.entries(q.data ?? {}).map(([k, v]) => [k, String(v)]));
  async function save() {
    try {
      await adminCall("/admin/query-weights", token, { method: "PUT", body: { weights: Object.entries(values).map(([kind, w]) => ({ kind, weight: Number(w) })) } });
      toast.success("Saved — applies within a minute");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["b2b-admin", "plans", "weights"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <FleetPanel title="What counts as a query" description="Each call counts this many queries. 0 = free (booking is 0 so bookings are never blocked). Website traffic never counts." icon={Scale} bodyClassName="p-4">
      <div className="grid gap-2 text-[13px] sm:grid-cols-4">
        {Object.entries(values).map(([k, v]) => (
          <label key={k}>{LABEL[k] ?? k}<Input className={inputSm} value={v} onChange={(e) => setDraft({ ...values, [k]: e.target.value })} /></label>
        ))}
      </div>
      {draft && <div className="mt-2"><PrimaryBtn onClick={save}>Save</PrimaryBtn></div>}
    </FleetPanel>
  );
}
