"use client";
// Listings (MusafirBaba staff): the approval queue (submitted listings and live ones with pending changes, oldest first)
// or every property, with filters.
import { useQuery } from "@tanstack/react-query";
import { Hotel, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ListingItem } from "../../admin-listing";
import { age } from "../../admin-kyc";
import { STATUS } from "../../listing";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetSelectClass, fleetTh, fleetTone, Input, inputSm, Notice, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./kit";

const TONE: Record<string, string> = { DRAFT: fleetTone.slate, SUBMITTED: fleetTone.sky, CHANGES_REQUESTED: fleetTone.amber, LIVE: fleetTone.emerald, SUSPENDED: fleetTone.red, ARCHIVED: fleetTone.slate };

export function ListingsTab({ token }: { token: string }) {
  const router = useRouter();
  const [view, setView] = useState<"queue" | "all">("queue");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const params = new URLSearchParams({ ...(view === "queue" ? { queue: "true" } : {}), ...(status && view === "all" ? { status } : {}), ...(q.trim() ? { q: q.trim() } : {}) }).toString();
  const list = useQuery({ queryKey: ["b2b-admin", "listings", params], queryFn: () => adminCall<{ data: ListingItem[] }>(`/admin/properties?${params}`, token), refetchInterval: 30_000 });
  const items = list.data?.data ?? [];
  return (
    <FleetPanel
      title={view === "queue" ? "Waiting for MusafirBaba" : "All properties"}
      description={list.data ? `${items.length} shown${view === "queue" ? " · oldest first" : ""}` : undefined}
      actions={
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <select aria-label="View" className={fleetSelectClass} value={view} onChange={(e) => setView(e.target.value as "queue" | "all")}>
            <option value="queue">Approval queue</option>
            <option value="all">All properties</option>
          </select>
          {view === "all" && (
            <select aria-label="Status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          <div className="relative md:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input className={`${inputSm} w-full pl-8`} placeholder="Name or MBHT- reference" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      }
    >
      {list.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.error ? (
        <div className="p-4">
          <Notice tone="red">{errorMessage(list.error)}</Notice>
        </div>
      ) : items.length === 0 ? (
        <FleetEmptyState icon={Hotel} title={view === "queue" ? "Nothing waiting" : "No properties found"} hint={view === "queue" ? "Submitted listings and pending changes appear here." : undefined} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${fleetTh} pl-4`}>Property</TableHead>
              <TableHead className={fleetTh}>City</TableHead>
              <TableHead className={fleetTh}>Status</TableHead>
              <TableHead className={`${fleetTh} pr-4 text-right`}>Waiting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => router.push(`/admin/b2b/properties/${l.id}`)}>
                <TableCell className="py-2 pl-4">
                  <div className="flex items-center gap-3">
                    {l.coverUrl ? <Image unoptimized src={l.coverUrl} width={64} height={40} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-slate-100" />}
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">{l.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">{l.publicRef}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[12px] text-slate-600">{l.city ?? "—"}</TableCell>
                <TableCell>
                  <FleetPill className={TONE[l.status] ?? fleetTone.slate}>{STATUS[l.status].label}</FleetPill>
                  {l.hasPendingRevision && <p className="mt-1 text-[11px] font-medium text-sky-700">Changes to review</p>}
                  {l.round > 1 && l.status === "SUBMITTED" && <p className="mt-1 text-[11px] text-slate-500">submitted {l.round} times</p>}
                </TableCell>
                <TableCell className="pr-4 text-right text-[12px] text-slate-500">{age(l.hasPendingRevision ? l.revisionSubmittedAt : l.submittedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </FleetPanel>
  );
}
