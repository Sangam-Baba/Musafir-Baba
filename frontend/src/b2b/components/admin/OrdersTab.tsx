"use client";
// B2B admin → Orders (Stage 08): hotels not answering (call them), the order explorer (search by order or booking
// reference, customer name / email / phone, status), one order's full timeline, payments, refunds, documents, and
// actions with two people — release an unpaid order's rooms, refund a failed paid order. Confirmed bookings are
// cancelled and refunded with Stage 09.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PhoneCall, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { inr } from "../../website/hotels";
import { adminCall } from "./AdminPassGate";
import { OfflineBookingPanel } from "./OfflineBookingPanel";
import { FleetEmptyState, FleetPanel, FleetPill, fleetSelectClass, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "./kit";

const STATUSES = ["", "AWAITING_PAYMENT", "PAYMENT_PENDING", "CONFIRMING", "CONFIRMED", "FAILED", "EXPIRED"] as const;
const TONE: Record<string, string> = { CONFIRMED: fleetTone.emerald, FAILED: fleetTone.red, EXPIRED: fleetTone.slate, AWAITING_PAYMENT: fleetTone.amber, PAYMENT_PENDING: fleetTone.amber, CONFIRMING: fleetTone.sky, HOLDING: fleetTone.sky };
type Row = { ref: string; status: string; totalPaise: number; contact: { name: string; email: string; phone: string }; bookingRefs: string[]; paid: boolean; failure: string | null; createdAt: string };
type Action = { id: string; action: "RELEASE" | "REFUND"; reason: string; status: string; proposedBy: string; decidedBy: string | null; result: string | null; createdAt: string };
type Detail = {
  order: { ref: string; status: string; totalPaise: number; gstPaise: number; contact: { name: string; email: string; phone: string }; items: { ref: string; property: { name: string }; roomTypeName: string; stay: { checkIn: string; checkOut: string } }[]; failure: { code: string } | null };
  payments: { txnId: string; status: string; amountPaise: number; failureReason: string | null; gatewayPaymentId: string | null }[];
  refunds: { refundId: string; key: string; status: string; amountPaise: number }[];
  documents: { id: string; type: string; number: string | null; version: number }[];
  actions: Action[];
  timeline: { at: string; what: string; by: string; note: string | null }[];
};
type Overdue = { ref: string; orderRef: string; propertyName: string | null; city: string | null; phone: string | null; email: string | null; checkIn: string; confirmedAt: string };
const when = (d: string) => new Date(d).toLocaleString("en-IN");

function HotelsNotAnswering({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "hotel-ack"], queryFn: () => adminCall<{ data: Overdue[] }>("/admin/hotel-ack", token), refetchInterval: 60_000, retry: false });
  const rows = q.data?.data ?? [];
  if (q.error || rows.length === 0) return null;
  return (
    <FleetPanel title="Hotels not answering" description="Confirmed bookings not acknowledged for over an hour — please call the hotel." icon={PhoneCall} bodyClassName="p-0">
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.ref} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
            <span className="font-medium text-slate-900">{r.propertyName}</span>
            <span className="text-slate-500">{r.city}</span>
            <span className="font-mono text-[12px] text-slate-600">{r.ref} · {r.orderRef}</span>
            <span className="text-slate-600">check-in {r.checkIn}</span>
            <span className="ml-auto font-medium text-slate-900">{r.phone ?? "no phone"}{r.email ? ` · ${r.email}` : ""}</span>
            <span className="text-[11px] text-slate-400">confirmed {when(r.confirmedAt)}</span>
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}

function Actions({ d, token }: { d: Detail; token: string }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "orders"] });
  async function propose(action: "RELEASE" | "REFUND") {
    setBusy(true);
    try {
      await adminCall(`/admin/orders/${d.order.ref}/actions`, token, { method: "POST", body: { action, reason: reason.trim() } });
      toast.success("Proposed — another person must approve it");
      setReason("");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function decide(id: string, approve: boolean) {
    try {
      const r = await adminCall<Action>(`/admin/order-actions/${id}/${approve ? "approve" : "reject"}`, token, { method: "POST", body: {} });
      toast[r.status === "FAILED" ? "error" : "success"](r.result ?? (approve ? "Approved" : "Rejected"));
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold text-slate-700">Actions (two people)</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input className={`${inputSm} w-72`} placeholder="Reason (at least 5 characters)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <SecondaryBtn disabled={busy || reason.trim().length < 5} onClick={() => propose("RELEASE")}>Release rooms</SecondaryBtn>
        <SecondaryBtn danger disabled={busy || reason.trim().length < 5} onClick={() => propose("REFUND")}>Refund</SecondaryBtn>
      </div>
      {d.actions.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
          <FleetPill className={a.status === "DONE" ? fleetTone.emerald : a.status === "PROPOSED" ? fleetTone.amber : fleetTone.slate}>{a.status}</FleetPill>
          <span className="font-medium text-slate-800">{a.action}</span> {a.reason} · by {a.proposedBy}{a.decidedBy ? ` · decided by ${a.decidedBy}` : ""}{a.result ? ` · ${a.result}` : ""}
          {a.status === "PROPOSED" && (
            <>
              <PrimaryBtn onClick={() => decide(a.id, true)}>Approve</PrimaryBtn>
              <SecondaryBtn onClick={() => decide(a.id, false)}>Reject</SecondaryBtn>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function OrderDetail({ orderRef, token }: { orderRef: string; token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "orders", "detail", orderRef], queryFn: () => adminCall<Detail>(`/admin/orders/${orderRef}`, token) });
  if (q.isLoading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (q.error || !q.data) return <p className="px-4 py-3 text-[13px] text-red-700">{errorMessage(q.error)}</p>;
  const d = q.data;
  return (
    <div className="space-y-3 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
      {d.order.items.map((it) => <p key={it.ref}><strong>{it.property.name}</strong> · {it.roomTypeName} · {it.stay.checkIn} → {it.stay.checkOut} · <span className="font-mono text-[12px]">{it.ref}</span></p>)}
      <p>{d.order.contact.name} · {d.order.contact.email} · {d.order.contact.phone} · {inr(d.order.totalPaise)} incl. {inr(d.order.gstPaise)} GST{d.order.failure ? ` · failed: ${d.order.failure.code}` : ""}</p>
      {d.payments.map((p) => <p key={p.txnId} className="text-[12px]">PayU {p.txnId} · {p.status} · {inr(p.amountPaise)}{p.gatewayPaymentId ? ` · PayU id ${p.gatewayPaymentId}` : ""}{p.failureReason ? ` · ${p.failureReason}` : ""}</p>)}
      {d.refunds.map((r) => <p key={r.refundId} className="text-[12px]">Refund {r.refundId} ({r.key}) · {r.status} · {inr(r.amountPaise)}</p>)}
      {d.documents.length > 0 && <p className="text-[12px]">Documents: {d.documents.map((x) => `${x.type}${x.number ? ` ${x.number}` : ""} v${x.version}`).join(" · ")}</p>}
      <Actions d={d} token={token} />
      <ol className="space-y-0.5 border-l border-slate-200 pl-3 text-[11px] text-slate-500">
        {d.timeline.map((t, i) => <li key={i}>{when(t.at)} · {t.what} · {t.by}{t.note ? ` — ${t.note}` : ""}</li>)}
      </ol>
    </div>
  );
}

export function OrdersTab({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("");
  const [open, setOpen] = useState<string | null>(null);
  const params = new URLSearchParams({ ...(search ? { q: search } : {}), ...(status ? { status } : {}) }).toString();
  const list = useQuery({ queryKey: ["b2b-admin", "orders", "list", params], queryFn: () => adminCall<{ data: Row[] }>(`/admin/orders${params ? `?${params}` : ""}`, token) });
  const rows = list.data?.data ?? [];
  return (
    <div className="space-y-3">
      <HotelsNotAnswering token={token} />
      <OfflineBookingPanel token={token} />
      <FleetPanel title="Orders" description="Website bookings: find one by reference, customer or status and see everything that happened." icon={ShoppingBag} bodyClassName="p-0">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <Input className={`${inputSm} w-72`} placeholder="MBO- / MBH- reference, name, email, phone, PayU txn" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}>
            {STATUSES.map((s) => <option key={s || "all"} value={s}>{s || "Any status"}</option>)}
          </select>
          <SecondaryBtn type="submit"><Search className="h-3.5 w-3.5" /> Search</SecondaryBtn>
        </form>
        {list.isLoading && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>}
        {list.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(list.error)}</p>}
        {!list.isLoading && rows.length === 0 && <FleetEmptyState icon={ShoppingBag} title="No orders found" />}
        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.ref}>
              <button className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-[13px] hover:bg-slate-50" onClick={() => setOpen(open === r.ref ? null : r.ref)}>
                <FleetPill className={TONE[r.status] ?? fleetTone.slate}>{r.status}</FleetPill>
                <span className="font-mono text-[12px] text-slate-700">{r.ref}</span>
                <span className="text-slate-600">{r.contact.name} · {r.contact.email}</span>
                <span className="text-slate-500">{r.bookingRefs.join(", ")}</span>
                <span className="ml-auto font-mono text-slate-800">{inr(r.totalPaise)}{r.paid ? "" : " · unpaid"}</span>
                <span className="w-36 text-right text-[11px] text-slate-400">{when(r.createdAt)}</span>
              </button>
              {open === r.ref && <OrderDetail orderRef={r.ref} token={token} />}
            </div>
          ))}
        </div>
      </FleetPanel>
    </div>
  );
}
