"use client";
// Bus payouts (bus company Owner, Stage 18 B7): what MusafirBaba owes for each booking — net fares of seats that
// travelled plus the company's share of cancellation charges — ready to pay once the trip ended, and the payouts made.
import { useQuery } from "@tanstack/react-query";
import { Banknote, Clock, Wallet } from "lucide-react";

import { b2b } from "@/b2b/api";
import { rupees, type BusPayable, type BusPayoutLine } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel, Pill, StatCard } from "@/b2b/components/portal/ui";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

const TONE = { PENDING: "blue", ELIGIBLE: "amber", PAID: "green", VOID: "violet" } as const;
const LABEL = { PENDING: "Trip not done yet", ELIGIBLE: "In the next payout", PAID: "Paid", VOID: "Nothing owed" } as const;

export default function BusPayoutsPage() {
  return <BusinessShell>{(me) => <BusPayouts me={me} />}</BusinessShell>;
}

function BusPayouts({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const can = me.permissions.includes("bus-payouts.payable.read");
  const payables = useQuery({ queryKey: ["b2b", "bus-payables", token, me.currentOrgId], queryFn: () => b2b<{ data: BusPayable[] }>("/bus/payables"), enabled: can });
  const payouts = useQuery({ queryKey: ["b2b", "bus-payouts", token, me.currentOrgId], queryFn: () => b2b<{ data: BusPayoutLine[] }>("/bus/payouts"), enabled: can });
  if (!can) return <p className="text-[13px] text-slate-600">Only the company Owner sees payouts.</p>;
  const items = payables.data?.data ?? [];
  const sum = (s: BusPayable["status"]) => items.filter((p) => p.status === s).reduce((t, p) => t + p.amountPaise, 0);
  return (
    <div className="space-y-4">
      <PageHeader crumb="Payouts" title="Bus" highlight="Payouts" subtitle="Your net fares for seats that travelled, plus your share of cancellation charges. Paid in the weekly bus payout run after the trip." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard icon={Clock} tone="blue" label="Trips not done yet" value={rupees(sum("PENDING"))} />
        <StatCard icon={Wallet} tone="amber" label="In the next payout" value={rupees(sum("ELIGIBLE"))} />
        <StatCard icon={Banknote} tone="green" label="Paid" value={rupees(sum("PAID"))} />
      </div>
      <Panel title="Payouts received">
        {(payouts.data?.data ?? []).length === 0 ? <p className="text-[13px] text-slate-500">No payouts yet.</p> : (
          <ul className="space-y-1 text-[13px]">{payouts.data?.data.map((l) => <li key={l._id} className="flex justify-between border-b border-slate-100 py-1"><span>{new Date(l.createdAt).toLocaleDateString("en-IN")} · {l.payableIds.length} booking{l.payableIds.length === 1 ? "" : "s"}</span><b>{rupees(l.netPaise)}</b></li>)}</ul>
        )}
      </Panel>
      <Panel title="By booking">
        {items.length === 0 ? <p className="text-[13px] text-slate-500">No bookings yet.</p> : (
          <ul className="space-y-1 text-[13px]">
            {items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-1.5">
                <span className="font-mono">{p.bookingRef}</span><span className="text-slate-500">trip {p.tripDate}</span>
                <Pill tone={TONE[p.status]}>{LABEL[p.status]}</Pill>
                <b className="ml-auto">{rupees(p.amountPaise)}</b>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
