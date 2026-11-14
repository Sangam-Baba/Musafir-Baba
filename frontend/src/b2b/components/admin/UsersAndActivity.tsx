"use client";
// Admin: search business users; the activity log of every organisation.
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { describeEntry } from "../../activity";
import { errorMessage } from "../../messages";
import { roleName } from "../../roles";
import type { AuditEntry, BusinessUser } from "../../types";
import { inputClass, Panel } from "../team/ui";
import { adminCall } from "./AdminPassGate";

interface UserDetail {
  user: BusinessUser;
  memberships: { orgId: string; orgName: string | null; orgType: string | null; orgStatus: string | null; status: string; roles: string[] }[];
}

export function UsersTab({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const search = useQuery({ queryKey: ["b2b-admin", "users", q], queryFn: () => adminCall<{ data: BusinessUser[] }>(`/admin/users?q=${encodeURIComponent(q.trim())}`, token), enabled: q.trim().length >= 2 });
  const detail = useQuery({ queryKey: ["b2b-admin", "user", open], queryFn: () => adminCall<UserDetail>(`/admin/users/${open}`, token), enabled: Boolean(open) });
  return (
    <Panel title="Business users">
      <input className={`${inputClass} mb-4 w-full`} placeholder="Search by email, phone or name (2+ letters)" value={q} onChange={(e) => setQ(e.target.value)} />
      {search.error && <p className="text-sm text-red-600">{errorMessage(search.error)}</p>}
      <ul className="divide-y divide-slate-100">
        {search.data?.data.map((u) => (
          <li key={u.id} className="py-2">
            <button onClick={() => setOpen(open === u.id ? null : u.id)} className="w-full text-left">
              <p className="text-sm font-medium text-slate-900">{u.name}</p>
              <p className="text-xs text-slate-500">
                {u.email ?? u.phone} · {u.status.toLowerCase()}
                {u.lastLoginAt ? ` · last sign-in ${new Date(u.lastLoginAt).toLocaleString()}` : ""}
              </p>
            </button>
            {open === u.id && detail.data && (
              <ul className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {detail.data.memberships.length === 0 && <li>No organisations.</li>}
                {detail.data.memberships.map((m) => (
                  <li key={m.orgId}>
                    {m.orgName ?? m.orgId} ({m.orgType?.toLowerCase()}, {m.orgStatus?.toLowerCase()}) — {m.roles.map(roleName).join(", ")} · {m.status.toLowerCase()}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Panel>
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
    <Panel title="Activity">
      {log.error && <p className="text-sm text-red-600">{errorMessage(log.error)}</p>}
      <ul className="divide-y divide-slate-100">
        {entries.length === 0 && !log.isLoading && <li className="py-2 text-sm text-slate-500">Nothing yet.</li>}
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap gap-3 py-2 text-sm">
            <span className="w-44 shrink-0 text-slate-500">{new Date(e.occurredAt).toLocaleString()}</span>
            <span className="flex-1 text-slate-800">{describeEntry(e)}</span>
          </li>
        ))}
      </ul>
      {log.hasNextPage && (
        <button onClick={() => log.fetchNextPage()} className="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Load more
        </button>
      )}
    </Panel>
  );
}
