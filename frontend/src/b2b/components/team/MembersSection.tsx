"use client";
// Members: who is in the team, their roles and branch limits; change roles, remove.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import { roleName } from "../../roles";
import type { Branch, Me, Member, Role } from "../../types";
import { Empty, Panel, SmallButton } from "./ui";

export function MembersSection({ me, roles, branches }: { me: Me; roles: Role[]; branches: Branch[] }) {
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ["b2b", "team", "members"], queryFn: () => b2b<{ data: Member[] }>("/members") });
  const [editing, setEditing] = useState<string | null>(null);
  const can = (p: string) => me.permissions.includes(p);
  const nameOf = (ref: string) => roles.find((r) => r.ref === ref)?.name ?? roleName(ref);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "branch";

  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name ?? m.email} from the team?`)) return;
    try {
      await b2b(`/members/${m.userId}`, { method: "DELETE" });
      toast.success("Removed");
      await queryClient.invalidateQueries({ queryKey: ["b2b", "team"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Panel title="Members">
      {members.isLoading && <Empty text="Loading…" />}
      {members.error && <Empty text={errorMessage(members.error)} />}
      <ul className="divide-y divide-slate-100">
        {members.data?.data.map((m) => (
          <li key={m.userId} className="py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {m.name ?? "—"} {m.userId === me.user.id && <span className="text-xs text-slate-400">(you)</span>}
                </p>
                <p className="text-[13px] text-slate-500">{m.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {m.roles.map(nameOf).join(", ")}
                  {m.branchIds.length > 0 && ` · only ${m.branchIds.map(branchName).join(", ")}`}
                  {m.ownOnly && " · only their own records"}
                </p>
              </div>
              {can("access.role.assign") && <SmallButton onClick={() => setEditing(editing === m.userId ? null : m.userId)}>Change role</SmallButton>}
              {can("organizations.member.remove") && m.userId !== me.user.id && (
                <SmallButton tone="danger" onClick={() => remove(m)}>
                  Remove
                </SmallButton>
              )}
            </div>
            {editing === m.userId && <RoleEditor member={m} roles={roles} branches={branches} onDone={() => setEditing(null)} />}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RoleEditor({ member, roles, branches, onDone }: { member: Member; roles: Role[]; branches: Branch[]; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string[]>(member.roles);
  const [branchIds, setBranchIds] = useState<string[]>(member.branchIds);
  const [ownOnly, setOwnOnly] = useState(member.ownOnly);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    try {
      await b2b(`/members/${member.userId}/roles`, { method: "PUT", body: { roles: chosen, branchIds, ownOnly } });
      toast.success("Role updated");
      await queryClient.invalidateQueries({ queryKey: ["b2b", "team"] });
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-600">Roles</p>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <label key={r.ref} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px]">
            <input type="checkbox" checked={chosen.includes(r.ref)} onChange={() => setChosen(toggle(chosen, r.ref))} />
            {r.name}
          </label>
        ))}
      </div>
      {branches.length > 0 && (
        <>
          <p className="text-xs font-medium text-slate-600">Limit to branches (none ticked = all branches)</p>
          <div className="flex flex-wrap gap-2">
            {branches
              .filter((b) => b.status === "ACTIVE")
              .map((b) => (
                <label key={b.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px]">
                  <input type="checkbox" checked={branchIds.includes(b.id)} onChange={() => setBranchIds(toggle(branchIds, b.id))} />
                  {b.name}
                </label>
              ))}
          </div>
        </>
      )}
      <label className="flex items-center gap-2 text-[13px] text-slate-700">
        <input type="checkbox" checked={ownOnly} onChange={(e) => setOwnOnly(e.target.checked)} />
        Only their own bookings and records
      </label>
      <div className="flex gap-2">
        <SmallButton tone="primary" onClick={save} disabled={chosen.length === 0}>
          Save
        </SmallButton>
        <SmallButton onClick={onDone}>Cancel</SmallButton>
      </div>
    </div>
  );
}
