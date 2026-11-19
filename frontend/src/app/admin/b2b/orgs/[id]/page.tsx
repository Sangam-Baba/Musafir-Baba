"use client";
// One organisation (MusafirBaba admin): details, status (suspend with a reason / reactivate), members, activity.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Building2, Eye, Loader2, RotateCcw, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import {
  AdminPageHeader,
  FleetEmptyState,
  FleetPage,
  FleetPanel,
  fleetSelectClass,
  fleetTh,
  Input,
  inputSm,
  Notice,
  OrgStatusPill,
  PrimaryBtn,
  SecondaryBtn,
  SECTION,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TypePill,
} from "@/b2b/components/admin/kit";
import { ClientCategoryPanel } from "@/b2b/components/admin/ClientCategories";
import type { AdminOrg } from "@/b2b/components/admin/OrgsTab";
import { ActivityTab } from "@/b2b/components/admin/UsersAndActivity";
import { errorMessage } from "@/b2b/messages";
import { roleName } from "@/b2b/roles";

type OrgDetail = AdminOrg & { members: { userId: string; name: string | null; email: string | null; status: string; roles: string[]; joinedAt: string }[] };

export default function AdminOrgPage() {
  const params = useParams<{ id: string }>();
  return <AdminPassGate>{(token) => <OrgDetailView id={params.id} token={token} />}</AdminPassGate>;
}

function OrgDetailView({ id, token }: { id: string; token: string }) {
  const queryClient = useQueryClient();
  const org = useQuery({ queryKey: ["b2b-admin", "org", id], queryFn: () => adminCall<OrgDetail>(`/admin/orgs/${id}`, token) });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function change(action: "suspend" | "reactivate") {
    setBusy(true);
    try {
      const r = await adminCall<{ sessionsEnded: number }>(`/admin/orgs/${id}/${action}`, token, { method: "POST", body: action === "suspend" ? { reason: reason.trim() } : {} });
      toast.success(action === "suspend" ? `Suspended — ${r.sessionsEnded} signed-in session(s) ended` : "Reactivated");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["b2b-admin"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (org.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (org.error || !org.data) {
    return (
      <FleetPage>
        <Notice tone="red">{errorMessage(org.error)}</Notice>
      </FleetPage>
    );
  }
  const o = org.data;
  return (
    <FleetPage>
      <AdminPageHeader
        section={SECTION}
        icon={Building2}
        title={o.displayName}
        badges={
          <>
            <TypePill type={o.type} />
            <OrgStatusPill status={o.status} />
          </>
        }
        description={`${o.legalName} · ${o.reference} · created ${new Date(o.createdAt).toLocaleDateString()}`}
        actions={
          <Link href="/admin/b2b">
            <SecondaryBtn>
              <ArrowLeft className="h-3.5 w-3.5" /> All organisations
            </SecondaryBtn>
          </Link>
        }
      />
      <FleetPanel title="Status" description="Suspending signs everyone out of this organisation immediately." icon={o.status === "SUSPENDED" ? RotateCcw : Ban} bodyClassName="space-y-3 p-4">
        {o.statusReason && <Notice tone={o.status === "SUSPENDED" ? "red" : "amber"}>Reason: {o.statusReason}</Notice>}
        {o.status === "SUSPENDED" ? (
          <PrimaryBtn onClick={() => change("reactivate")} disabled={busy}>
            <RotateCcw className="h-3.5 w-3.5" /> Reactivate
          </PrimaryBtn>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); change("suspend"); }} className="flex flex-wrap gap-2">
            <Input className={`${inputSm} min-w-64 flex-1`} placeholder="Reason (shown to its members), e.g. KYC documents expired" value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} required />
            <SecondaryBtn danger type="submit" disabled={busy}>
              <Ban className="h-3.5 w-3.5" /> Suspend
            </SecondaryBtn>
          </form>
        )}
      </FleetPanel>
      {o.type === "CLIENT" && <ClientCategoryPanel orgId={id} current={o.clientCategory ?? null} token={token} />}
      <ViewAsPanel orgId={id} token={token} />
      <FleetPanel title="Members" description={`${o.members.length} member(s)`} icon={Users}>
        {o.members.length === 0 ? (
          <FleetEmptyState icon={Users} title="No members yet" hint="The owner's invitation may still be pending." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>Member</TableHead>
                <TableHead className={fleetTh}>Roles</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.members.map((m) => (
                <TableRow key={m.userId} className="hover:bg-slate-50/70">
                  <TableCell className="py-2.5 pl-4">
                    <p className="text-[13px] font-medium text-slate-900">{m.name ?? m.userId}</p>
                    {m.email && <p className="text-[11px] text-slate-500">{m.email}</p>}
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-700">{m.roles.map(roleName).join(", ")}</TableCell>
                  <TableCell className="text-[12px] capitalize text-slate-600">{m.status.toLowerCase()}</TableCell>
                  <TableCell className="pr-4 text-right text-[12px] text-slate-500">{new Date(m.joinedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FleetPanel>
      <ActivityTab token={token} orgId={id} />
    </FleetPage>
  );
}

/** Open the org's business area as MusafirBaba support (30 min, reason required, owners emailed). */
function ViewAsPanel({ orgId, token }: { orgId: string; token: string }) {
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"READ" | "WRITE">("READ");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { orgId, reason: reason.trim(), mode, ...(mode === "WRITE" ? { code: code.trim() } : {}) };
      const r = await adminCall<{ viewAsToken: string }>("/admin/view-as", token, { method: "POST", body });
      window.open(`/business#viewAs=${encodeURIComponent(r.viewAsToken)}`, "_blank", "noopener");
      toast.success("Opened in a new tab — the owners have been told");
      setReason("");
      setCode("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FleetPanel title="View as this organisation" description="See their business area exactly as they do, for 30 minutes. Owners are emailed and it is recorded in their activity log." icon={Eye} bodyClassName="p-4">
      <form onSubmit={start} className="flex flex-wrap gap-2">
        <Input className={`${inputSm} min-w-64 flex-1`} placeholder="Reason, e.g. hotel asked for help with their team page" value={reason} onChange={(e) => setReason(e.target.value)} minLength={10} required />
        <select aria-label="Mode" className={fleetSelectClass} value={mode} onChange={(e) => setMode(e.target.value as "READ" | "WRITE")}>
          <option value="READ">Read-only</option>
          <option value="WRITE">With changes (needs app code)</option>
        </select>
        {mode === "WRITE" && <Input className={`${inputSm} w-36`} placeholder="App code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" required />}
        <PrimaryBtn type="submit" disabled={busy}>
          <Eye className="h-3.5 w-3.5" /> View as
        </PrimaryBtn>
      </form>
    </FleetPanel>
  );
}
