"use client";
// Roles: the built-in roles and the organisation's own; create a custom role by ticking permissions.
// Locked permissions (sensitive, or ones you don't hold) can't be ticked — the server enforces it too.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import type { ChoosablePermission, Me, Role } from "../../types";
import { inputClass, Panel, SmallButton } from "./ui";

export function RolesSection({ me, roles }: { me: Me; roles: Role[] }) {
  const queryClient = useQueryClient();
  const canManage = me.permissions.includes("access.role.manage");
  const [creating, setCreating] = useState(false);

  async function remove(r: Role) {
    if (!window.confirm(`Delete the role "${r.name}"?`)) return;
    try {
      await b2b(`/roles/${r.ref.slice("custom:".length)}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["b2b", "team"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Panel title="Roles" action={canManage && !creating ? <SmallButton onClick={() => setCreating(true)}>New custom role</SmallButton> : undefined}>
      {creating && <RoleForm onDone={() => setCreating(false)} />}
      <ul className="divide-y divide-slate-100">
        {roles.map((r) => (
          <li key={r.ref} className="flex flex-wrap items-center gap-3 py-3">
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {r.name} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">{r.kind === "system" ? "built-in" : "custom"}</span>
              </p>
              <p className="text-sm text-slate-500">{r.description || `${r.permissions.length} permissions`}</p>
            </div>
            {r.kind === "custom" && canManage && (
              <SmallButton tone="danger" onClick={() => remove(r)}>
                Delete
              </SmallButton>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RoleForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const choosable = useQuery({ queryKey: ["b2b", "team", "permissions"], queryFn: () => b2b<{ data: ChoosablePermission[] }>("/roles/permissions") });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const groups = new Map<string, ChoosablePermission[]>();
  for (const p of choosable.data?.data ?? []) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await b2b("/roles", { method: "POST", body: { name: name.trim(), description: description.trim(), permissions: picked } });
      toast.success("Role created");
      await queryClient.invalidateQueries({ queryKey: ["b2b", "team"] });
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <form onSubmit={save} className="mb-5 space-y-3 rounded-lg bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        <input className={`${inputClass} flex-1`} placeholder="Role name, e.g. Junior Agent" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={`${inputClass} flex-[2]`} placeholder="What is it for? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {[...groups.entries()].map(([group, perms]) => (
        <div key={group}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {perms.map((p) => (
              <label key={p.code} className={`flex items-start gap-2 text-sm ${p.locked ? "text-slate-400" : "text-slate-700"}`} title={p.locked ? "Not available for custom roles" : p.code}>
                <input type="checkbox" className="mt-0.5" disabled={p.locked} checked={picked.includes(p.code)} onChange={() => setPicked(picked.includes(p.code) ? picked.filter((x) => x !== p.code) : [...picked, p.code])} />
                {p.description}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <SmallButton tone="primary" type="submit" disabled={picked.length === 0}>
          Create role
        </SmallButton>
        <SmallButton type="button" onClick={onDone}>
          Cancel
        </SmallButton>
      </div>
    </form>
  );
}
