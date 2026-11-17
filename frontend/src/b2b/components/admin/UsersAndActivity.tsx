"use client";
// Admin: search business users; the activity log of every organisation (or one).
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Activity, Search, Users } from "lucide-react";
import { useState } from "react";

import { describeEntry } from "../../activity";
import { errorMessage } from "../../messages";
import { roleName } from "../../roles";
import type { AuditEntry, BusinessUser } from "../../types";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, fleetTh, Input, inputSm, Notice, SecondaryBtn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./kit";

interface UserDetail {
  user: BusinessUser;
  memberships: { orgId: string; orgName: string | null; orgType: string | null; orgStatus: string | null; status: string; roles: string[] }[];
}

export function UsersTab({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const search = useQuery({ queryKey: ["b2b-admin", "users", q], queryFn: () => adminCall<{ data: BusinessUser[] }>(`/admin/users?q=${encodeURIComponent(q.trim())}`, token), enabled: q.trim().length >= 2 });
  const detail = useQuery({ queryKey: ["b2b-admin", "user", open], queryFn: () => adminCall<UserDetail>(`/admin/users/${open}`, token), enabled: Boolean(open) });
  const users = search.data?.data ?? [];
  return (
    <FleetPanel
      title="Business users"
      description="Search by email, phone or name (2+ letters). Click a user to see their organisations."
      actions={
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input className={`${inputSm} w-full pl-8`} placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      }
    >
      {search.error && (
        <div className="p-4">
          <Notice tone="red">{errorMessage(search.error)}</Notice>
        </div>
      )}
      {q.trim().length < 2 || users.length === 0 ? (
        <FleetEmptyState icon={Users} title={q.trim().length < 2 ? "Search for a business user" : "No users found"} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${fleetTh} pl-4`}>User</TableHead>
              <TableHead className={fleetTh}>Status</TableHead>
              <TableHead className={`${fleetTh} pr-4 text-right`}>Last sign-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="cursor-pointer align-top hover:bg-slate-50/70" onClick={() => setOpen(open === u.id ? null : u.id)}>
                <TableCell className="py-2.5 pl-4">
                  <p className="text-[13px] font-medium text-slate-900">{u.name}</p>
                  <p className="text-[11px] text-slate-500">{u.email ?? u.phone}</p>
                  {open === u.id && detail.data && (
                    <ul className="mt-2 space-y-0.5 text-[12px] text-slate-600">
                      {detail.data.memberships.length === 0 && <li>No organisations.</li>}
                      {detail.data.memberships.map((m) => (
                        <li key={m.orgId}>
                          {m.orgName ?? m.orgId} · {m.orgType?.toLowerCase()} · {m.roles.map(roleName).join(", ")}
                          {m.status !== "ACTIVE" && ` · ${m.status.toLowerCase()}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell className="text-[12px] capitalize text-slate-600">{u.status.toLowerCase()}</TableCell>
                <TableCell className="pr-4 text-right text-[12px] text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </FleetPanel>
  );
}

export function ActivityTab({ token, orgId }: { token: string; orgId?: string }) {
  const log = useInfiniteQuery({
    queryKey: ["b2b-admin", "audit", orgId ?? "all"],
    queryFn: ({ pageParam }) => adminCall<{ data: AuditEntry[]; next: string | null }>(`/admin/audit?limit=30${orgId ? `&orgId=${orgId}` : ""}${pageParam ? `&before=${pageParam}` : ""}`, token),
    initialPageParam: "",
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const entries = log.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <FleetPanel title="Activity" description="Newest first." icon={Activity}>
      {log.error && (
        <div className="p-4">
          <Notice tone="red">{errorMessage(log.error)}</Notice>
        </div>
      )}
      {entries.length === 0 && !log.isLoading ? (
        <FleetEmptyState icon={Activity} title="Nothing yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${fleetTh} w-48 pl-4`}>When</TableHead>
              <TableHead className={`${fleetTh} pr-4`}>What happened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id} className="hover:bg-slate-50/70">
                <TableCell className="py-2 pl-4 text-[12px] text-slate-500">{new Date(e.occurredAt).toLocaleString()}</TableCell>
                <TableCell className="pr-4 text-[13px] text-slate-800">{describeEntry(e)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {log.hasNextPage && (
        <div className="border-t border-slate-100 p-3">
          <SecondaryBtn onClick={() => log.fetchNextPage()}>Load more</SecondaryBtn>
        </div>
      )}
    </FleetPanel>
  );
}
