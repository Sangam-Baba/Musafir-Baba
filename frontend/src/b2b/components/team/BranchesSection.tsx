"use client";
// Branches (B2B clients only): offices that bookings and team members can be limited to.
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import type { Branch, Me } from "../../types";
import { Empty, inputClass, Panel, SmallButton } from "./ui";

export function BranchesSection({ me, branches }: { me: Me; branches: Branch[] }) {
  const queryClient = useQueryClient();
  const canManage = me.permissions.includes("organizations.branch.manage");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["b2b", "team"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await b2b("/branches", { method: "POST", body: { name: name.trim(), ...(city.trim() ? { city: city.trim() } : {}) } });
      setName("");
      setCity("");
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function setStatus(b: Branch, status: Branch["status"]) {
    try {
      await b2b(`/branches/${b.id}`, { method: "PATCH", body: { status } });
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel title="Branches">
      {canManage && (
        <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
          <input className={`${inputClass} flex-1`} placeholder="Branch name, e.g. Delhi HQ" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
          <SmallButton tone="primary" type="submit">
            Add branch
          </SmallButton>
        </form>
      )}
      {branches.length === 0 && <Empty text="No branches yet. Without branches, everyone works across the whole organisation." />}
      <ul className="divide-y divide-slate-100">
        {branches.map((b) => (
          <li key={b.id} className="flex items-center gap-3 py-1.5">
            <p className={`flex-1 text-[13px] ${b.status === "CLOSED" ? "text-slate-400 line-through" : "text-slate-900"}`}>
              {b.name}
              {b.city ? ` · ${b.city}` : ""}
            </p>
            {canManage && (b.status === "ACTIVE" ? <SmallButton onClick={() => setStatus(b, "CLOSED")}>Close</SmallButton> : <SmallButton onClick={() => setStatus(b, "ACTIVE")}>Reopen</SmallButton>)}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
