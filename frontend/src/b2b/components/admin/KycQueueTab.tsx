"use client";
// Verification queue (MusafirBaba staff): oldest submitted first; who is reviewing; high risk and second approvals marked.
import { useQuery } from "@tanstack/react-query";
import { FileCheck2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { age, lockState, RISK_TEXT, type QueueItem } from "../../admin-kyc";
import { STATUS_TEXT } from "../../kyc";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetSelectClass, fleetTh, fleetTone, Notice, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./kit";

export function KycQueueTab({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");
  const params = new URLSearchParams({ ...(status && { status }), ...(risk && { risk }) }).toString();
  const queue = useQuery({
    queryKey: ["b2b-admin", "kyc", params],
    queryFn: () => adminCall<{ data: QueueItem[] }>(`/admin/kyc-applications${params ? `?${params}` : ""}`, token),
    refetchInterval: 30_000,
  });
  const list = queue.data?.data ?? [];
  return (
    <FleetPanel
      title="Verification queue"
      description={queue.data ? `${list.length} shown · oldest first` : undefined}
      actions={
        <div className="flex flex-col gap-2 md:flex-row">
          <select aria-label="Status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Waiting + in review</option>
            {(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DRAFT"] as const).map((s) => (
              <option key={s} value={s}>
                {STATUS_TEXT[s].label}
              </option>
            ))}
          </select>
          <select aria-label="Risk" className={fleetSelectClass} value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="">All risk</option>
            <option value="high">High risk</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      }
    >
      {queue.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : queue.error ? (
        <div className="p-4">
          <Notice tone="red">{errorMessage(queue.error)}</Notice>
        </div>
      ) : list.length === 0 ? (
        <FleetEmptyState icon={FileCheck2} title="Nothing waiting" hint="New applications appear here as hotels submit them." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${fleetTh} pl-4`}>Business</TableHead>
              <TableHead className={fleetTh}>Status</TableHead>
              <TableHead className={fleetTh}>Risk</TableHead>
              <TableHead className={fleetTh}>Reviewer</TableHead>
              <TableHead className={`${fleetTh} pr-4 text-right`}>Waiting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((a) => {
              const lock = lockState({ review: { reviewerId: a.reviewerId, lockedUntil: a.lockedUntil } }, null);
              return (
                <TableRow key={a.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => router.push(`/admin/b2b/kyc/${a.id}`)}>
                  <TableCell className="py-2.5 pl-4">
                    <p className="text-[13px] font-medium text-slate-900">{a.legalName ?? "—"}</p>
                    <p className="text-[11px] text-slate-500">
                      {a.orgType === "HOTEL" ? "Hotel" : "Client"}
                      {a.round > 1 ? ` · submitted ${a.round} times` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <FleetPill className={a.status === "APPROVED" ? fleetTone.emerald : a.status === "REJECTED" ? fleetTone.amber : fleetTone.sky}>{STATUS_TEXT[a.status].label}</FleetPill>
                    {a.awaitingSecondApproval && <p className="mt-1 text-[11px] font-medium text-violet-700">Needs second approval</p>}
                    {a.pendingGstRegistrations > 0 && <p className="mt-1 text-[11px] font-medium text-sky-700">{a.pendingGstRegistrations} GSTIN to check</p>}
                  </TableCell>
                  <TableCell>
                    {a.risk.highRisk ? (
                      <FleetPill className={fleetTone.red}>High · {a.risk.flags.map((f) => RISK_TEXT[f] ?? f).join(", ")}</FleetPill>
                    ) : (
                      <span className="text-[12px] text-slate-500">Normal</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-600">{lock.other ? `In review until ${new Date(a.lockedUntil ?? "").toLocaleTimeString()}` : "—"}</TableCell>
                  <TableCell className="pr-4 text-right text-[12px] text-slate-500">{age(a.submittedAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </FleetPanel>
  );
}
