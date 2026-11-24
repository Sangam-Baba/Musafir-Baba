"use client";
// Finance → System health (Stage 16): the scheduled safety checks (rooms booked + held ≤ total, ledger balanced,
// nothing stuck) — last run, what is failing now, problems in the last 7 days, and days in a row without a problem
// (go-live needs 7). Refreshes every minute.
import { useQuery } from "@tanstack/react-query";
import { HeartPulse, Loader2 } from "lucide-react";

import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, FleetPill, fleetTone } from "../kit";

type Check = { name: string; violations: number; sample: string[]; error: string | null };
type Health = {
  lastRun: { at: string; ok: boolean; checks: Check[] } | null;
  failingNow: Check[];
  cleanSince: string | null;
  daysClean: number;
  problemsLast7Days: { at: string; checks: string[] }[];
  stale: boolean;
};
const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN") : "—");

export function HealthPanel({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "health"], queryFn: () => adminCall<Health>("/admin/system-health", token), refetchInterval: 60_000 });
  const h = q.data;
  return (
    <FleetPanel title="System health" description="Safety checks run every 10 minutes. Any problem is logged and emailed to the ops address (B2B_OPS_ALERT_EMAIL). Go-live needs 7 days without a problem." icon={HeartPulse}>
      {q.isLoading && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>}
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {h && (
        <div className="space-y-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-3">
            {h.stale ? <FleetPill className={fleetTone.red}>Checks not running for 30+ minutes</FleetPill> : h.failingNow.length ? <FleetPill className={fleetTone.red}>{h.failingNow.length} failing now</FleetPill> : <FleetPill className={fleetTone.emerald}>All clear</FleetPill>}
            <span>Last run: <b>{when(h.lastRun?.at ?? null)}</b></span>
            <span>Days without a problem: <b>{h.daysClean}</b>{h.cleanSince ? ` (since ${when(h.cleanSince)})` : ""}</span>
          </div>
          {h.failingNow.map((c) => (
            <div key={c.name} className="rounded-md border border-red-200 bg-red-50 p-2">
              <p className="font-medium text-red-800">{c.name} — {c.error ?? `${c.violations} problem(s)`}</p>
              {c.sample.map((s) => <p key={s} className="font-mono text-[11px] text-red-700">{s}</p>)}
            </div>
          ))}
          {h.lastRun && (
            <div className="grid gap-1 sm:grid-cols-2">
              {h.lastRun.checks.map((c) => (
                <p key={c.name} className="flex items-center gap-2 text-[12px] text-slate-600"><span className={`h-2 w-2 rounded-full ${c.violations || c.error ? "bg-red-500" : "bg-emerald-500"}`} />{c.name}</p>
              ))}
            </div>
          )}
          {h.problemsLast7Days.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-700">Problems in the last 7 days</p>
              {h.problemsLast7Days.map((p) => <p key={p.at} className="text-[12px] text-slate-600">{when(p.at)} — {p.checks.join(", ")}</p>)}
            </div>
          )}
        </div>
      )}
    </FleetPanel>
  );
}
