"use client";
// Super Admins give MusafirBaba staff their B2B roles. Staff are found by the email of their existing
// admin login (read-only — the existing admin accounts are never changed).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, fleetTh, fleetTone, Input, inputSm, Notice, PrimaryBtn, SecondaryBtn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./kit";
import { FleetPill } from "@/components/admin/fleet/FleetUI";

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
      toast.error(errorMessage(err));
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

  const people = list.data?.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      <FleetPanel title="Give B2B access" description="Find a staff member by the email of their admin login, then tick their B2B roles." icon={UserPlus} bodyClassName="space-y-3 p-4">
        <form onSubmit={lookup} className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input className={`${inputSm} w-full pl-8`} type="email" placeholder="Admin login email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <PrimaryBtn type="submit">Find</PrimaryBtn>
        </form>
        {found && (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-[13px] font-medium text-slate-900">
              {found.name} <span className="font-normal text-slate-500">{found.email}</span>
              {!found.isActive && <span className="ml-2 text-red-600">inactive account</span>}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_ROLES.map((r) => (
                <label key={r.key} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2.5 text-[13px]">
                  <input type="checkbox" className="mt-0.5 accent-[#FE5300]" checked={roles.includes(r.key)} onChange={() => setRoles(roles.includes(r.key) ? roles.filter((x) => x !== r.key) : [...roles, r.key])} />
                  <span>
                    <span className="font-medium text-slate-900">{r.name}</span>
                    <span className="block text-[11px] text-slate-500">{r.text}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <PrimaryBtn onClick={() => save(found, roles)}>Save access</PrimaryBtn>
              <SecondaryBtn onClick={() => setFound(null)}>Cancel</SecondaryBtn>
            </div>
            <p className="text-[11px] text-slate-500">They open B2B admin with their own admin login and get 7 days to set up two-step login.</p>
          </div>
        )}
      </FleetPanel>
      <FleetPanel title="Staff with B2B access" description={list.data ? `${people.length} staff` : undefined} icon={ShieldCheck}>
        {list.error ? (
          <div className="p-4">
            <Notice tone="red">{errorMessage(list.error)}</Notice>
          </div>
        ) : people.length === 0 ? (
          <FleetEmptyState icon={ShieldCheck} title="Nobody yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>Staff member</TableHead>
                <TableHead className={fleetTh}>B2B roles</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((s) => (
                <TableRow key={s.staffId} className="hover:bg-slate-50/70">
                  <TableCell className="py-2.5 pl-4">
                    <p className="text-[13px] font-medium text-slate-900">{s.name ?? s.staffId}</p>
                    <p className="text-[11px] text-slate-500">{s.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.roles.map((r) => (
                        <FleetPill key={r} className={r === "platform.superAdmin" ? fleetTone.orange : fleetTone.slate} dot={false}>
                          {roleLabel(r)}
                        </FleetPill>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <SecondaryBtn onClick={() => { setFound(s); setRoles(s.roles); setEmail(s.email ?? ""); }}>Change</SecondaryBtn>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FleetPanel>
    </div>
  );
}
