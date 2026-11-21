"use client";
// B2B admin → Hotel payouts (Stage 09): hotels with payables ready to pay; record a bank transfer against them (amount =
// their total, UTR, bank date — locks them); a different person approves (ledger payable → bank) or rejects.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Landmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

type Due = { _id: string; amountPaise: number; bookings: number; oldest: string };
type Payable = { id: string; bookingRef: string; checkOut: string; amountPaise: number; status: string };
type Payout = { id: string; ref: string; hotelOrgId: string; payableCount: number; amountPaise: number; utr: string; paidOn: string; status: string; proposedBy: string; decidedBy: string | null };

function RecordPayout({ hotelOrgId, token, onDone }: { hotelOrgId: string; token: string; onDone: () => void }) {
  const q = useQuery({ queryKey: ["b2b-admin", "payables", hotelOrgId], queryFn: () => adminCall<{ data: Payable[] }>(`/admin/payables?hotelOrgId=${hotelOrgId}&status=ELIGIBLE`, token) });
  const rows = (q.data?.data ?? []).filter((p) => p.status === "ELIGIBLE");
  const [utr, setUtr] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const total = rows.reduce((s, p) => s + p.amountPaise, 0);
  async function submit() {
    try {
      await adminCall("/admin/manual-payouts", token, { method: "POST", body: { hotelOrgId, payableIds: rows.map((p) => p.id), amountPaise: total, utr: utr.trim(), paidOn } });
      toast.success("Recorded — another person must approve it");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="space-y-1 bg-slate-50 px-4 py-3 text-[13px]">
      {rows.map((p) => <p key={p.id} className="text-slate-700">{p.bookingRef} · check-out {p.checkOut} · {inr(p.amountPaise)}</p>)}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Total {inr(total)}</span>
        <Input className={`${inputSm} w-44`} placeholder="Bank UTR" value={utr} onChange={(e) => setUtr(e.target.value)} />
        <input type="date" className="h-8 rounded-md border border-slate-200 px-2" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        <PrimaryBtn disabled={rows.length === 0 || utr.trim().length < 6 || !paidOn} onClick={submit}>Record payout</PrimaryBtn>
      </div>
    </div>
  );
}

export function PayoutsPanel({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const due = useQuery({ queryKey: ["b2b-admin", "payables-due"], queryFn: () => adminCall<{ data: Due[] }>("/admin/payables/due", token), retry: false });
  const payouts = useQuery({ queryKey: ["b2b-admin", "payouts"], queryFn: () => adminCall<{ data: Payout[] }>("/admin/manual-payouts", token), retry: false });
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => {
    setOpen(null);
    void queryClient.invalidateQueries({ queryKey: ["b2b-admin"] });
  };
  async function decide(id: string, approve: boolean) {
    try {
      await adminCall(`/admin/manual-payouts/${id}/${approve ? "approve" : "reject"}`, token, { method: "POST", body: {} });
      toast.success(approve ? "Approved — payables paid" : "Rejected — payables unlocked");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="space-y-3">
      <FleetPanel title="Ready to pay" description="Hotels with payables ready to pay (stay over, cancellation or no-show final). Make the bank transfer, then record it here." icon={Banknote} bodyClassName="p-0">
        {due.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(due.error)}</p>}
        {!due.isLoading && (due.data?.data ?? []).length === 0 && <FleetEmptyState icon={Banknote} title="Nothing to pay" />}
        {(due.data?.data ?? []).map((d) => (
          <div key={d._id}>
            <button className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-[13px] hover:bg-slate-50" onClick={() => setOpen(open === d._id ? null : d._id)}>
              <span className="font-mono text-[12px] text-slate-600">hotel {d._id.slice(-6)}</span>
              <span className="text-slate-600">{d.bookings} booking{d.bookings > 1 ? "s" : ""} · oldest {new Date(d.oldest).toLocaleDateString("en-IN")}</span>
              <span className="ml-auto font-semibold text-slate-900">{inr(d.amountPaise)}</span>
            </button>
            {open === d._id && <RecordPayout hotelOrgId={d._id} token={token} onDone={refresh} />}
          </div>
        ))}
      </FleetPanel>
      <FleetPanel title="Recorded payouts" description="Approve only after checking the transfer on the bank statement. The person who recorded it can't approve it." icon={Landmark} bodyClassName="p-0">
        {!payouts.isLoading && (payouts.data?.data ?? []).length === 0 && <FleetEmptyState icon={Landmark} title="No payouts yet" />}
        {(payouts.data?.data ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] last:border-0">
            <FleetPill className={p.status === "APPROVED" ? fleetTone.emerald : p.status === "PROPOSED" ? fleetTone.amber : fleetTone.slate}>{p.status}</FleetPill>
            <span className="font-mono text-[12px]">{p.ref}</span>
            <span className="text-slate-600">hotel {p.hotelOrgId.slice(-6)} · {p.payableCount} bookings · UTR {p.utr} · {p.paidOn} · by {p.proposedBy}{p.decidedBy ? ` · decided by ${p.decidedBy}` : ""}</span>
            <span className="ml-auto font-semibold">{inr(p.amountPaise)}</span>
            {p.status === "PROPOSED" && (
              <>
                <PrimaryBtn onClick={() => decide(p.id, true)}>Approve</PrimaryBtn>
                <SecondaryBtn onClick={() => decide(p.id, false)}>Reject</SecondaryBtn>
              </>
            )}
          </div>
        ))}
      </FleetPanel>
    </div>
  );
}
