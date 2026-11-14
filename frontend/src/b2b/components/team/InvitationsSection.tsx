"use client";
// Invitations: invite by email with a role (and branches for clients), see and cancel pending ones.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import { roleName } from "../../roles";
import type { Branch, Invitation, Me, Role } from "../../types";
import { Empty, inputClass, Panel, SmallButton } from "./ui";

export function InvitationsSection({ me, roles, branches }: { me: Me; roles: Role[]; branches: Branch[] }) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["b2b", "team", "invitations"], queryFn: () => b2b<{ data: Invitation[] }>("/invitations") });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const canInvite = me.permissions.includes("organizations.member.invite");
  const nameOf = (ref: string) => roles.find((r) => r.ref === ref)?.name ?? roleName(ref);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await b2b("/invitations", { method: "POST", body: { email: email.trim(), roles: [role], ...(branchId ? { branchIds: [branchId] } : {}) } });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["b2b", "team", "invitations"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await b2b(`/invitations/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["b2b", "team", "invitations"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel title="Invitations">
      {canInvite && (
        <form onSubmit={invite} className="mb-5 flex flex-wrap items-end gap-2">
          <input className={`${inputClass} min-w-56 flex-1`} type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="" disabled>
              Role…
            </option>
            {roles.map((r) => (
              <option key={r.ref} value={r.ref}>
                {r.name}
              </option>
            ))}
          </select>
          {branches.length > 0 && (
            <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All branches</option>
              {branches
                .filter((b) => b.status === "ACTIVE")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    Only {b.name}
                  </option>
                ))}
            </select>
          )}
          <SmallButton tone="primary" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send invitation"}
          </SmallButton>
        </form>
      )}
      {list.data?.data.length === 0 && <Empty text="No pending invitations." />}
      <ul className="divide-y divide-slate-100">
        {list.data?.data.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{i.email}</p>
              <p className="text-xs text-slate-500">
                {i.roles.map(nameOf).join(", ")} · expires {new Date(i.expiresAt).toLocaleDateString()}
              </p>
            </div>
            {canInvite && (
              <SmallButton tone="danger" onClick={() => revoke(i.id)}>
                Cancel
              </SmallButton>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
