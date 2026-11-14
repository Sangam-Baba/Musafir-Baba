"use client";
// One organisation (MusafirBaba admin): details, members, suspend with a reason / reactivate, activity.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import { StatusPill, type AdminOrg } from "@/b2b/components/admin/OrgsTab";
import { ActivityTab } from "@/b2b/components/admin/UsersAndActivity";
import { inputClass, Panel, SmallButton } from "@/b2b/components/team/ui";
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

  async function change(action: "suspend" | "reactivate") {
    try {
      const r = await adminCall<{ sessionsEnded: number }>(`/admin/orgs/${id}/${action}`, token, { method: "POST", body: action === "suspend" ? { reason: reason.trim() } : {} });
      toast.success(action === "suspend" ? `Suspended — ${r.sessionsEnded} signed-in session(s) ended` : "Reactivated");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["b2b-admin"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (org.error) return <p className="text-sm text-red-600">{errorMessage(org.error)}</p>;
  if (!org.data) return <p className="text-sm text-slate-500">Loading…</p>;
  const o = org.data;
  return (
    <div className="space-y-4">
      <Link href="/admin/b2b" className="text-sm text-slate-500 hover:text-[#FE5300]">
        ← All organisations
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{o.displayName}</h1>
        <StatusPill status={o.status} />
      </div>
      <p className="text-sm text-slate-500">
        {o.type === "HOTEL" ? "Hotel company" : "B2B client"} · {o.reference} · {o.legalName} · created {new Date(o.createdAt).toLocaleDateString()}
        {o.statusReason ? ` · reason: ${o.statusReason}` : ""}
      </p>
      <Panel title="Status">
        {o.status === "SUSPENDED" ? (
          <SmallButton tone="primary" onClick={() => change("reactivate")}>Reactivate</SmallButton>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); change("suspend"); }} className="flex flex-wrap gap-2">
            <input className={`${inputClass} flex-1`} placeholder="Reason (shown to its members), e.g. KYC documents expired" value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} required />
            <SmallButton tone="danger" type="submit">Suspend</SmallButton>
          </form>
        )}
        <p className="mt-2 text-xs text-slate-500">Suspending signs everyone out of this organisation immediately.</p>
      </Panel>
      <Panel title={`Members (${o.members.length})`}>
        <ul className="divide-y divide-slate-100 text-sm">
          {o.members.length === 0 && <li className="py-2 text-slate-500">No members yet — the owner's invitation may still be pending.</li>}
          {o.members.map((m) => (
            <li key={m.userId} className="py-2">
              <span className="font-medium text-slate-900">{m.name ?? m.userId}</span> {m.email && <span className="text-slate-500">({m.email})</span>} — {m.roles.map(roleName).join(", ")} · {m.status.toLowerCase()} · joined {new Date(m.joinedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </Panel>
      <ActivityTab token={token} orgId={id} />
    </div>
  );
}
