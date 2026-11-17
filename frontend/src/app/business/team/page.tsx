"use client";
// Team page: members, invitations, roles and (for B2B clients) branches of the current organisation.
import { useQuery } from "@tanstack/react-query";
import { Activity, KeyRound, Mail, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, StatCard, Tabs } from "@/b2b/components/portal/ui";
import { BranchesSection } from "@/b2b/components/team/BranchesSection";
import { InvitationsSection } from "@/b2b/components/team/InvitationsSection";
import { MembersSection } from "@/b2b/components/team/MembersSection";
import { RolesSection } from "@/b2b/components/team/RolesSection";
import { roleName } from "@/b2b/roles";
import type { Branch, Invitation, Me, Member, Role } from "@/b2b/types";

export default function TeamPage() {
  return <BusinessShell>{(me) => (me.currentOrgId ? <Team me={me} /> : <p className="text-sm text-slate-600">Choose an organisation at the top first.</p>)}</BusinessShell>;
}

function Team({ me }: { me: Me }) {
  const isClient = me.memberships.find((m) => m.orgId === me.currentOrgId)?.type === "CLIENT";
  const can = (p: string) => me.permissions.includes(p);
  const roles = useQuery({ queryKey: ["b2b", "team", "roles", me.currentOrgId], queryFn: () => b2b<{ data: Role[] }>("/roles"), enabled: can("access.role.read") });
  const branches = useQuery({
    queryKey: ["b2b", "team", "branches", me.currentOrgId],
    queryFn: () => b2b<{ data: Branch[] }>("/branches"),
    enabled: isClient && can("organizations.branch.read"),
  });
  const tabs = [
    { value: "members", label: "Members", icon: Users, show: can("organizations.member.read") },
    { value: "invitations", label: "Invitations", icon: Mail, show: can("organizations.member.read") },
    { value: "roles", label: "Roles", icon: KeyRound, show: can("access.role.read") },
    { value: "branches", label: "Branches", icon: ShieldCheck, show: isClient && can("organizations.branch.read") },
  ].filter((t) => t.show);
  // same queries (and cache) as the Members and Invitations tabs
  const members = useQuery({ queryKey: ["b2b", "team", "members"], queryFn: () => b2b<{ data: Member[] }>("/members"), enabled: can("organizations.member.read") });
  const invitations = useQuery({ queryKey: ["b2b", "team", "invitations"], queryFn: () => b2b<{ data: Invitation[] }>("/invitations"), enabled: can("organizations.member.read") });
  const myRole = me.memberships.find((m) => m.orgId === me.currentOrgId)?.roles[0] ?? "";
  const [tab, setTab] = useState(tabs[0]?.value ?? "members");
  const roleList = roles.data?.data ?? [];
  const branchList = branches.data?.data ?? [];

  if (tabs.length === 0) return <p className="text-sm text-slate-600">Your role doesn&apos;t include team management.</p>;
  const pending = (invitations.data?.data ?? []).filter((i) => i.status === "PENDING").length;
  const n = (loading: boolean, v: number) => (loading ? "…" : v);
  return (
    <div className="space-y-6">
      <PageHeader
        crumb="Team & Access"
        title="Team & Access"
        highlight="Management"
        subtitle="Add team members, give them roles and manage their access."
        actions={
          <Link href="/business/activity" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-[#FE5300]">
            <Activity className="h-4 w-4" /> Access logs
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("organizations.member.read") && <StatCard icon={Users} label="Team members" value={n(members.isLoading, members.data?.data.length ?? 0)} />}
        {can("organizations.member.read") && <StatCard icon={Mail} tone="blue" label="Pending invitations" value={n(invitations.isLoading, pending)} />}
        {can("access.role.read") && <StatCard icon={KeyRound} tone="violet" label="Roles" value={n(roles.isLoading, roleList.length)} />}
        <StatCard icon={ShieldCheck} tone="green" label="Your role" value={roleName(myRole)} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
      {tab === "members" && <MembersSection me={me} roles={roleList} branches={branchList} />}
      {tab === "invitations" && <InvitationsSection me={me} roles={roleList} branches={branchList} />}
      {tab === "roles" && <RolesSection me={me} roles={roleList} />}
      {tab === "branches" && <BranchesSection me={me} branches={branchList} />}
    </div>
  );
}
