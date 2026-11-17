"use client";
// Team page: members, invitations, roles and (for B2B clients) branches of the current organisation.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { BranchesSection } from "@/b2b/components/team/BranchesSection";
import { InvitationsSection } from "@/b2b/components/team/InvitationsSection";
import { MembersSection } from "@/b2b/components/team/MembersSection";
import { RolesSection } from "@/b2b/components/team/RolesSection";
import type { Branch, Me, Role } from "@/b2b/types";

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
    { key: "members", label: "Members", show: can("organizations.member.read") },
    { key: "invitations", label: "Invitations", show: can("organizations.member.read") },
    { key: "roles", label: "Roles", show: can("access.role.read") },
    { key: "branches", label: "Branches", show: isClient && can("organizations.branch.read") },
  ].filter((t) => t.show);
  const [tab, setTab] = useState(tabs[0]?.key ?? "members");
  const roleList = roles.data?.data ?? [];
  const branchList = branches.data?.data ?? [];

  if (tabs.length === 0) return <p className="text-sm text-slate-600">Your role doesn&apos;t include team management.</p>;
  return (
    <div className="space-y-4">
      <PageHeader crumb="Team & Access" title="Team & Access" highlight="Management" subtitle="Add team members, give them roles and manage their access." />
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.key ? "border-[#FE5300] font-medium text-[#FE5300]" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "members" && <MembersSection me={me} roles={roleList} branches={branchList} />}
      {tab === "invitations" && <InvitationsSection me={me} roles={roleList} branches={branchList} />}
      {tab === "roles" && <RolesSection me={me} roles={roleList} />}
      {tab === "branches" && <BranchesSection me={me} branches={branchList} />}
    </div>
  );
}
