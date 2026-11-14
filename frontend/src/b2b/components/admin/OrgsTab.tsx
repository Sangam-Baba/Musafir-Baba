"use client";
// All client and hotel organisations: filter, search, create (with an owner invitation).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { inputClass, Panel, SmallButton } from "../team/ui";
import { adminCall } from "./AdminPassGate";

export interface AdminOrg {
  id: string;
  type: "CLIENT" | "HOTEL";
  reference: string;
  legalName: string;
  displayName: string;
  status: string;
  statusReason: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  ONBOARDING: "bg-blue-50 text-blue-700",
  SUSPENDED: "bg-red-50 text-red-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>{status.toLowerCase()}</span>;
}

export function OrgsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const params = new URLSearchParams({ ...(type && { type }), ...(status && { status }), ...(q.trim() && { q: q.trim() }) }).toString();
  const orgs = useQuery({ queryKey: ["b2b-admin", "orgs", params], queryFn: () => adminCall<{ data: AdminOrg[] }>(`/admin/orgs${params ? `?${params}` : ""}`, token) });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: "HOTEL", legalName: "", displayName: "", ownerEmail: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = { type: form.type, legalName: form.legalName.trim(), ...(form.displayName.trim() && { displayName: form.displayName.trim() }), ...(form.ownerEmail.trim() && { ownerEmail: form.ownerEmail.trim() }) };
      await adminCall("/admin/orgs", token, { method: "POST", body });
      toast.success(form.ownerEmail.trim() ? `Created — invitation emailed to ${form.ownerEmail.trim()}` : "Created");
      setCreating(false);
      setForm({ type: "HOTEL", legalName: "", displayName: "", ownerEmail: "" });
      await queryClient.invalidateQueries({ queryKey: ["b2b-admin", "orgs"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel title="Organisations" action={<SmallButton tone="primary" onClick={() => setCreating(!creating)}>{creating ? "Close" : "New organisation"}</SmallButton>}>
      {creating && (
        <form onSubmit={create} className="mb-5 grid gap-2 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
          <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="HOTEL">Hotel company</option>
            <option value="CLIENT">B2B client (travel business)</option>
          </select>
          <input className={inputClass} placeholder="Legal name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
          <input className={inputClass} placeholder="Display name (optional)" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input className={inputClass} type="email" placeholder="Owner's email — gets an invitation (optional)" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          <div className="sm:col-span-2">
            <SmallButton tone="primary" type="submit">Create</SmallButton>
          </div>
        </form>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={`${inputClass} flex-1`} placeholder="Search name or reference" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="HOTEL">Hotels</option>
          <option value="CLIENT">Clients</option>
        </select>
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["ONBOARDING", "ACTIVE", "SUSPENDED", "CLOSED"].map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
      </div>
      {orgs.error && <p className="text-sm text-red-600">{errorMessage(orgs.error)}</p>}
      <ul className="divide-y divide-slate-100">
        {orgs.data?.data.length === 0 && <li className="py-3 text-sm text-slate-500">No organisations match.</li>}
        {orgs.data?.data.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/b2b/orgs/${o.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-slate-50">
              <div className="flex-1">
                <p className="font-medium text-slate-900">{o.displayName}</p>
                <p className="text-xs text-slate-500">
                  {o.type === "HOTEL" ? "Hotel" : "Client"} · {o.reference} · {o.legalName}
                </p>
              </div>
              <StatusPill status={o.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
