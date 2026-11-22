"use client";
// A B2B client's order (Stage 12 part B): what is held and for how long, paying from the wallet (balance and credit
// shown) or by PayU, then the confirmation with the voucher, tax invoice and receipt.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, Wallet as WalletIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { b2b, B2B_API, refreshBusinessSession } from "../../api";
import { submitPayuForm, type PayuForm } from "../../finance";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import { idempotencyKey, type Wallet } from "../../wallet";
import type { Order, OrderDocument } from "../../website/checkout";
import { inr } from "../../website/hotels";

type ClientOrderView = Order & { paymentMode: string; customerReference: string | null };
const DOC_LABEL: Record<OrderDocument["type"], string> = { VOUCHER: "Voucher", TAX_INVOICE: "Tax invoice", RECEIPT: "Receipt", CREDIT_NOTE: "Credit note" };
const FAILED_TEXT: Record<string, string> = {
  INSUFFICIENT_WALLET_BALANCE: "There wasn't enough in your wallet, so the rooms were let go. Add money and book again.",
  CREDIT_OVERDUE: "Your credit payment is overdue, so the rooms were let go. Add money and book again.",
  ROOMS_LOST: "The rooms were no longer available. Nothing was taken from your wallet.",
};

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!until) return null;
  const left = Math.max(0, new Date(until).getTime() - now);
  return `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
}

async function openDocument(ref: string, id: string) {
  const get = (token: string | null) => fetch(`${B2B_API}/client/orders/${encodeURIComponent(ref)}/documents/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
  try {
    let res = await get(useBusinessSession.getState().accessToken);
    if (res.status === 401) res = await get(await refreshBusinessSession());
    if (!res.ok) throw new Error("Could not open the document");
    window.open(URL.createObjectURL(await res.blob()), "_blank", "noopener");
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

function PayBox({ order, canPay }: { order: ClientOrderView; canPay: boolean }) {
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ["b2b", "wallet"], queryFn: () => b2b<Wallet>("/wallet"), retry: false });
  const [busy, setBusy] = useState<"WALLET" | "GATEWAY" | null>(null);
  const left = useCountdown(order.holdExpiresAt);
  async function pay(method: "WALLET" | "GATEWAY") {
    setBusy(method);
    try {
      const r = await b2b<PayuForm & { status?: string }>(`/client/orders/${encodeURIComponent(order.ref)}/pay`, { method: "POST", body: { method }, headers: { "Idempotency-Key": idempotencyKey() } });
      if (method === "GATEWAY") return submitPayuForm(r);
      toast.success(r.status === "CONFIRMED" ? "Booked and paid from your wallet" : "Payment received");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      void qc.invalidateQueries({ queryKey: ["b2b"] });
    }
  }
  const enough = wallet.data ? wallet.data.availablePaise >= order.totalPaise : false;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-[13px]">
      <p className="text-slate-700">Rooms held for <b>{left ?? "—"}</b>. Pay before the time runs out.</p>
      {!canPay && <p className="text-slate-600">Ask someone who can book for your company to pay for this order.</p>}
      {canPay && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 font-semibold text-slate-900"><WalletIcon size={15} /> Wallet / credit</p>
            {wallet.data ? <p className="text-slate-600">Available {inr(wallet.data.availablePaise)}{wallet.data.creditLimitPaise > 0 ? " (incl. credit)" : ""}</p> : <p className="text-slate-500">{wallet.error ? errorMessage(wallet.error) : "Loading…"}</p>}
            <button disabled={!enough || busy !== null} onClick={() => pay("WALLET")} className="mt-2 rounded-lg bg-[#FE5300] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy === "WALLET" ? "Paying…" : `Pay ${inr(order.totalPaise)}`}</button>
            {wallet.data && !enough && <p className="mt-1 text-[12px] text-slate-500"><Link href="/business/wallet" className="text-[#FE5300] underline">Add money</Link> first, or pay by PayU.</p>}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold text-slate-900">PayU</p>
            <p className="text-slate-600">UPI, cards, net banking</p>
            <button disabled={busy !== null} onClick={() => pay("GATEWAY")} className="mt-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 disabled:opacity-50">{busy === "GATEWAY" ? "Opening PayU…" : "Pay with PayU"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientOrder({ orderRef, canPay }: { orderRef: string; canPay: boolean }) {
  const q = useQuery({
    queryKey: ["b2b", "client-order", orderRef],
    queryFn: () => b2b<ClientOrderView>(`/client/orders/${encodeURIComponent(orderRef)}`),
    refetchInterval: (query) => (["CONFIRMING", "PAYMENT_PENDING"].includes(query.state.data?.status ?? "") ? 3000 : false),
  });
  const confirmed = q.data?.status === "CONFIRMED";
  const docs = useQuery({ queryKey: ["b2b", "client-order-docs", orderRef], queryFn: () => b2b<{ data: OrderDocument[] }>(`/client/orders/${encodeURIComponent(orderRef)}/documents`), enabled: confirmed, refetchInterval: (query) => ((query.state.data?.data.length ?? 0) === 0 ? 4000 : false) });
  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!q.data) return <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{errorMessage(q.error)}</p>;
  const o = q.data;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-slate-900">Order {o.ref}</p>
          {o.customerReference && <span className="text-slate-500">· your ref {o.customerReference}</span>}
          <span className="ml-auto font-semibold text-slate-900">{inr(o.totalPaise)} <span className="font-normal text-slate-500">incl. GST {inr(o.gstPaise)}</span></span>
        </div>
        {o.items.map((it) => (
          <div key={it.ref} className="mt-2 border-t border-slate-100 pt-2 text-slate-700">
            <p className="font-medium text-slate-900">{it.property.name} — {it.roomTypeName}</p>
            <p>{it.stay.checkIn} → {it.stay.checkOut} · {it.stay.nights} night{it.stay.nights > 1 ? "s" : ""} · {it.rooms.map((r) => r.leadGuest).join(", ")}</p>
            <p className="text-slate-500">{it.cancellation.summary}</p>
          </div>
        ))}
      </div>
      {o.status === "AWAITING_PAYMENT" && <PayBox order={o} canPay={canPay} />}
      {["CONFIRMING", "PAYMENT_PENDING"].includes(o.status) && <p className="rounded-xl bg-slate-50 p-4 text-[13px] text-slate-700"><Loader2 className="mr-1 inline animate-spin" size={14} /> Confirming with the hotel…</p>}
      {(o.status === "FAILED" || o.status === "EXPIRED") && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{FAILED_TEXT[o.failure?.code ?? ""] ?? "This order didn't go through. Please search again."}</p>}
      {confirmed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-900">
          <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 size={16} /> Confirmed{o.paymentMode === "WALLET" ? " · paid from your wallet" : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(docs.data?.data ?? []).map((d) => (
              <button key={d.id} onClick={() => openDocument(o.ref, d.id)} className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-emerald-800"><FileText size={14} /> {DOC_LABEL[d.type]}{d.number ? ` ${d.number}` : ""}</button>
            ))}
            {(docs.data?.data.length ?? 0) === 0 && <span className="text-emerald-800">Preparing your documents…</span>}
          </div>
        </div>
      )}
    </div>
  );
}
