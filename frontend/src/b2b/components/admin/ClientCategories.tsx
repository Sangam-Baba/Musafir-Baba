"use client";
// Client categories (MusafirBaba admin, Stage 10): the list (Standard / Silver / Gold …) and a client's category.
// Margin rules (Pricing tab) and hotels limited to categories use the key, so B2B prices follow the category.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetPanel, fleetSelectClass, Input, inputSm, PrimaryBtn, SecondaryBtn } from "./kit";

export type ClientCategory = { key: string; name: string; description: string | null; order: number; active: boolean };

export function useClientCategories(token: string, includeInactive = false) {
  return useQuery({
    queryKey: ["b2b-admin", "client-categories", includeInactive],
    queryFn: () => adminCall<{ data: ClientCategory[] }>(`/admin/client-categories${includeInactive ? "?includeInactive=true" : ""}`, token),
  });
}

/** On a client's page: its category, changeable by staff who manage organisations. */
export function ClientCategoryPanel({ orgId, current, token }: { orgId: string; current: string | null; token: string }) {
  const queryClient = useQueryClient();
  const list = useClientCategories(token);
  const [pick, setPick] = useState(current ?? "");
  async function save() {
    try {
      await adminCall(`/admin/orgs/${orgId}/client-category`, token, { method: "PUT", body: { key: pick } });
      toast.success("Category saved — B2B prices follow it within a minute");
      void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "org", orgId] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <FleetPanel title="Client category" description="Decides which margin rules and category-limited hotels apply to this client." icon={Layers} bodyClassName="flex flex-wrap items-center gap-2 p-4">
      <select className={`${fleetSelectClass} w-56`} value={pick} onChange={(e) => setPick(e.target.value)}>
        <option value="">— none yet —</option>
        {(list.data?.data ?? []).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
      </select>
      <PrimaryBtn disabled={!pick || pick === current} onClick={save}>Save</PrimaryBtn>
      {!current && <span className="text-[12px] text-slate-500">New clients get Standard when they are verified.</span>}
    </FleetPanel>
  );
}

/** The list itself: add, rename, reorder, switch off (never deleted). */
export function ClientCategoriesAdmin({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const list = useClientCategories(token, true);
  const [form, setForm] = useState({ key: "", name: "" });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "client-categories"] });
  async function call(path: string, method: "POST" | "PATCH", body: unknown, ok: string) {
    try {
      await adminCall(path, token, { method, body });
      toast.success(ok);
      refresh();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }
  return (
    <FleetPanel title="Client categories" description="Tiers for B2B clients (e.g. Gold agents get their own margin rule). Switched-off categories stay on clients that have them." icon={Layers} bodyClassName="p-0">
      <div className="divide-y divide-slate-100">
        {(list.data?.data ?? []).map((c) => (
          <div key={c.key} className={`flex flex-wrap items-center gap-2 px-4 py-2 text-[13px] ${c.active ? "" : "bg-slate-50 opacity-70"}`}>
            <span className="w-28 font-mono text-[11px] text-slate-500">{c.key}</span>
            <span className="flex-1 text-slate-800">{c.name}</span>
            <SecondaryBtn danger={c.active} onClick={() => call(`/admin/client-categories/${c.key}`, "PATCH", { active: !c.active }, c.active ? "Switched off" : "Switched on")}>
              {c.active ? "Switch off" : "Switch on"}
            </SecondaryBtn>
          </div>
        ))}
      </div>
      <form
        className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await call("/admin/client-categories", "POST", { key: form.key.trim().toUpperCase(), name: form.name.trim() }, "Category added")) setForm({ key: "", name: "" });
        }}
      >
        <Input className={`${inputSm} w-36`} placeholder="KEY (e.g. PLATINUM)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        <Input className={`${inputSm} w-48`} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <PrimaryBtn type="submit" disabled={form.key.trim().length < 2 || form.name.trim().length < 2}>Add category</PrimaryBtn>
      </form>
    </FleetPanel>
  );
}
