"use client";
// The organisation's activity log: sign-ins, team and role changes. Newest first.
import { useInfiniteQuery } from "@tanstack/react-query";

import { describeEntry } from "@/b2b/activity";
import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import type { AuditEntry, Me } from "@/b2b/types";

export default function ActivityPage() {
  return <BusinessShell>{(me) => <Activity me={me} />}</BusinessShell>;
}

function Activity({ me }: { me: Me }) {
  const allowed = me.permissions.includes("audit.event.read");
  const log = useInfiniteQuery({
    queryKey: ["b2b", "activity", me.currentOrgId],
    queryFn: ({ pageParam }) => b2b<{ data: AuditEntry[]; next: string | null }>(`/audit?limit=30${pageParam ? `&before=${pageParam}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: allowed && Boolean(me.currentOrgId),
  });
  if (!me.currentOrgId) return <p className="text-sm text-slate-600">Choose an organisation at the top first.</p>;
  if (!allowed) return <p className="text-sm text-slate-600">Your role doesn&apos;t include the activity log.</p>;
  const entries = log.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <div className="space-y-4">
      <PageHeader crumb="Activity" title="Activity" highlight="Log" subtitle="Sign-ins and changes in your business." />
      {log.error && <p className="text-sm text-red-600">{errorMessage(log.error)}</p>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {entries.length === 0 && !log.isLoading && <li className="p-5 text-sm text-slate-500">Nothing yet.</li>}
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className="w-44 shrink-0 text-slate-500">{new Date(e.occurredAt).toLocaleString()}</span>
            <span className="flex-1 text-slate-800">{describeEntry(e)}</span>
          </li>
        ))}
      </ul>
      {log.hasNextPage && (
        <button onClick={() => log.fetchNextPage()} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Load more
        </button>
      )}
    </div>
  );
}
