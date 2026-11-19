"use client";
// All client and hotel organisations: filter, search, create (with an owner invitation).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { ClientCategoriesAdmin } from "./ClientCategories";
import {
  FleetEmptyState,
  FleetPanel,
  fleetSelectClass,
  fleetTh,
  Input,
  inputSm,
  labelSm,
  Notice,
  OrgStatusPill,
  PrimaryBtn,
  SecondaryBtn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TypePill,
} from "./kit";

export interface AdminOrg {
  id: string;
  type: "CLIENT" | "HOTEL";
  clientCategory?: string | null;
  reference: string;
  legalName: string;
  displayName: string;
  status: string;
  statusReason: string | null;
  createdAt: string;
}

const EMPTY_FORM = { type: "HOTEL", legalName: "", displayName: "", ownerEmail: "" };

export function OrgsTab({ token }: { token: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const params = new URLSearchParams({ ...(type && { type }), ...(status && { status }), ...(q.trim() && { q: q.trim() }) }).toString();
  const orgs = useQuery({ queryKey: ["b2b-admin", "orgs", params], queryFn: () => adminCall<{ data: AdminOrg[] }>(`/admin/orgs${params ? `?${params}` : ""}`, token) });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const list = orgs.data?.data ?? [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const owner = form.ownerEmail.trim();
      const body = { type: form.type, legalName: form.legalName.trim(), ...(form.displayName.trim() && { displayName: form.displayName.trim() }), ...(owner && { ownerEmail: owner }) };
      await adminCall("/admin/orgs", token, { method: "POST", body });
      toast.success(owner ? `Organisation created — invitation sent to ${owner}` : "Organisation created");
      setCreating(false);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["b2b-admin", "orgs"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {creating && (
        <FleetPanel title="New organisation" description="It starts as onboarding. The owner gets an emailed invitation to create their account." icon={Plus} bodyClassName="p-4">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={labelSm}>Type</span>
              <select className={`${fleetSelectClass} w-full`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="HOTEL">Hotel company</option>
                <option value="CLIENT">B2B client (travel business)</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelSm}>Legal name</span>
              <Input className={inputSm} value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
            </label>
            <label className="space-y-1">
              <span className={labelSm}>Display name (optional)</span>
              <Input className={inputSm} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className={labelSm}>Owner&apos;s email (optional — gets the invitation)</span>
              <Input className={inputSm} type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <PrimaryBtn type="submit" disabled={busy}>{busy ? "Creating…" : "Create organisation"}</PrimaryBtn>
              <SecondaryBtn type="button" onClick={() => setCreating(false)}>Cancel</SecondaryBtn>
            </div>
          </form>
        </FleetPanel>
      )}
      <FleetPanel
        title="All organisations"
        description={orgs.data ? `${list.length} shown` : undefined}
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input className={`${inputSm} w-full pl-8`} placeholder="Search name or reference" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select aria-label="Filter by type" className={fleetSelectClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              <option value="HOTEL">Hotels</option>
              <option value="CLIENT">Clients</option>
            </select>
            <select aria-label="Filter by status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["ONBOARDING", "ACTIVE", "SUSPENDED", "CLOSED"].map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
            {!creating && (
              <PrimaryBtn onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5" /> New organisation
              </PrimaryBtn>
            )}
          </div>
        }
      >
        {orgs.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.error ? (
          <div className="p-4">
            <Notice tone="red">{errorMessage(orgs.error)}</Notice>
          </div>
        ) : list.length === 0 ? (
          <FleetEmptyState icon={Building2} title="No organisations found" hint="Create one, or clear the search and filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>Organisation</TableHead>
                <TableHead className={fleetTh}>Type</TableHead>
                <TableHead className={fleetTh}>Reference</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => router.push(`/admin/b2b/orgs/${o.id}`)}>
                  <TableCell className="py-2.5 pl-4">
                    <p className="text-[13px] font-medium text-slate-900">{o.displayName}</p>
                    <p className="text-[11px] text-slate-500">{o.legalName}</p>
                  </TableCell>
                  <TableCell>
                    <TypePill type={o.type} />
                    {o.clientCategory && <span className="ml-1.5 text-[11px] text-slate-500">{o.clientCategory.toLowerCase()}</span>}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-slate-600">{o.reference}</TableCell>
                  <TableCell>
                    <OrgStatusPill status={o.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-[12px] text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FleetPanel>
      <ClientCategoriesAdmin token={token} />
    </div>
  );
}
