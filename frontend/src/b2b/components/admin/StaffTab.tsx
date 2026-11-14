"use client";
// Super Admins give MusafirBaba staff their B2B roles. Staff are found by the email of their existing
// admin login (read-only — the existing admin accounts are never changed).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { inputClass, Panel, SmallButton } from "../team/ui";
import { adminCall } from "./AdminPassGate";

const PLATFORM_ROLES = [
  { key: "platform.superAdmin", name: "Super Admin", text: "Everything, incl. giving staff access (max 2)" },
  { key: "platform.operations", name: "Operations", text: "Clients, hotels, KYC, bookings" },
  { key: "platform.finance", name: "Finance", text: "Wallets, payments, refunds, payouts, reports" },
  { key: "platform.hotels", name: "Hotels / Contracting", text: "Listings approval, margins, hotel support" },
  { key: "platform.support", name: "Support", text: "Read most things (no changes)" },
];
const roleLabel = (k: string) => PLATFORM_ROLES.find((r) => r.key === k)?.name ?? k;

interface StaffAccess {
  staffId: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  roles: string[];
}

export function StaffTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["b2b-admin", "staff"], queryFn: () => adminCall<{ data: StaffAccess[] }>("/admin/staff", token) });
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<StaffAccess | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    try {
      const s = await adminCall<StaffAccess>(`/admin/staff/lookup?email=${encodeURIComponent(email.trim())}`, token);
      setFound(s);
      setRoles(s.roles);
    } catch (err) {
      setFound(null);
      toast.error(err instanceof Error && "code" in err && (err as { code: string }).code === "STAFF_NOT_FOUND" ? "No admin account with that email." : errorMessage(err));
    }
  }

  async function save(staff: StaffAccess, next: string[]) {
    try {
      await adminCall(`/admin/staff/${staff.staffId}/roles`, token, { method: "PUT", body: { roles: next } });
      toast.success(next.length ? `${staff.email ?? "Staff"}: ${next.map(roleLabel).join(", ")}` : `${staff.email ?? "Staff"} no longer has B2B access`);
      setFound(null);
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["b2b-admin", "staff"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Give B2B access to a staff member">
        <form onSubmit={lookup} className="flex flex-wrap gap-2">
          <input className={`${inputClass} flex-1`} type="email" placeholder="Their admin login email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <SmallButton tone="primary" type="submit">Find</SmallButton>
        </form>
        {found && (
          <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              {found.name} ({found.email}){!found.isActive && <span className="ml-2 text-red-600">inactive account</span>}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLATFORM_ROLES.map((r) => (
                <label key={r.key} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm">
                  <input type="checkbox" className="mt-0.5" checked={roles.includes(r.key)} onChange={() => setRoles(roles.includes(r.key) ? roles.filter((x) => x !== r.key) : [...roles, r.key])} />
                  <span>
                    <span className="font-medium text-slate-900">{r.name}</span>
                    <span className="block text-xs text-slate-500">{r.text}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <SmallButton tone="primary" onClick={() => save(found, roles)}>Save access</SmallButton>
              <SmallButton onClick={() => setFound(null)}>Cancel</SmallButton>
            </div>
            <p className="text-xs text-slate-500">They open B2B admin with their own admin login; they get 7 days to set up two-step login.</p>
          </div>
        )}
      </Panel>
      <Panel title="Staff with B2B access">
        {list.error && <p className="text-sm text-red-600">{errorMessage(list.error)}</p>}
        <ul className="divide-y divide-slate-100">
          {list.data?.data.map((s) => (
            <li key={s.staffId} className="flex flex-wrap items-center gap-3 py-2">
              <div className="flex-1 text-sm">
                <p className="font-medium text-slate-900">{s.name ?? s.staffId} <span className="font-normal text-slate-500">{s.email}</span></p>
                <p className="text-xs text-slate-500">{s.roles.map(roleLabel).join(", ")}</p>
              </div>
              <SmallButton onClick={() => { setFound(s); setRoles(s.roles); setEmail(s.email ?? ""); }}>Change</SmallButton>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
