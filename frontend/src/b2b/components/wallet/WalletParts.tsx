"use client";
// Client wallet page parts (Stage 11): balance cards, add money (PayU / bank transfer), recent top-ups, statement and
// the low-balance setting. Amounts typed in rupees; the server works in paise and checks everything again.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b, B2B_API, refreshBusinessSession } from "../../api";
import { rupeesToPaise, submitPayuForm, type PayuForm } from "../../finance";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import { idempotencyKey, MANUAL_LABEL, topUpLabel, TRANSFER_METHODS, type Credit, type ManualTopUp, type TopUp, type Wallet, type WalletStatement } from "../../wallet";
import { inr } from "../../website/hotels";

const card = "rounded-xl border border-slate-200 bg-white p-4";
const input = "h-9 rounded-lg border border-slate-200 px-2 text-[13px]";
const button = "rounded-lg bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};
const dateText = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export function BalanceCards({ wallet, credit }: { wallet: Wallet; credit: Credit | undefined }) {
  const items: [string, number, string?][] = [
    ["Available to spend", wallet.availablePaise, "Balance − money held for checkouts + credit"],
    ["Balance", wallet.balancePaise],
    ["Held for checkouts", wallet.heldPaise],
  ];
  if (wallet.creditLimitPaise > 0) items.push(["Credit used", wallet.creditUsedPaise, `of ${inr(wallet.creditLimitPaise)} limit`]);
  return (
    <div className="space-y-3">
      {credit?.overdue && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
          {inr(credit.usedPaise)} of credit was due on {credit.dueAt ? dateText(credit.dueAt) : "—"}. New bookings are paused until you add money.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([label, v, hint]) => (
          <div key={label} className={card}>
            <p className="text-[12px] text-slate-500">{label}</p>
            <p className={`text-lg font-semibold ${v < 0 ? "text-red-700" : "text-slate-900"}`}>{inr(v)}</p>
            {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
          </div>
        ))}
      </div>
      {credit && credit.limitPaise > 0 && credit.usedPaise > 0 && !credit.overdue && credit.dueAt && (
        <p className="text-[12px] text-slate-600">Credit used is due by {dateText(credit.dueAt)} ({credit.dueDays} days from when your wallet went below zero).</p>
      )}
    </div>
  );
}

export function AddMoney({ canTopUp }: { canTopUp: boolean }) {
  const [rupees, setRupees] = useState("");
  const pay = useMutation({
    mutationFn: (amountPaise: number) => b2b<PayuForm>("/wallet/top-ups", { method: "POST", body: { amountPaise }, headers: { "Idempotency-Key": idempotencyKey() } }),
    onSuccess: (form) => submitPayuForm(form),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const paise = rupeesToPaise(rupees);
  const ok = paise !== null && paise >= 10_000 && paise <= 50_000_000;
  if (!canTopUp) return <p className={`${card} text-[13px] text-slate-600`}>Ask your company&apos;s owner or accountant to add money.</p>;
  return (
    <div className={card}>
      <p className="mb-2 font-semibold text-slate-900">Add money online</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-slate-600">₹</span>
        <input inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} placeholder="25,000" className={`${input} w-40`} aria-label="Amount in rupees" />
        <button disabled={!ok || pay.isPending} onClick={() => paise && pay.mutate(paise)} className={button}>
          {pay.isPending ? "Opening PayU…" : "Pay with PayU"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">₹100 to ₹5,00,000 per payment (UPI, cards, net banking). For larger amounts use a bank transfer.</p>
    </div>
  );
}

export function BankTransfer({ canTopUp }: { canTopUp: boolean }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["b2b", "wallet", "manual"], queryFn: () => b2b<{ data: ManualTopUp[]; bankDetails: string | null }>("/wallet/manual-top-ups") });
  const [f, setF] = useState({ rupees: "", method: "NEFT" as (typeof TRANSFER_METHODS)[number], utr: "", paidOn: today(), note: "" });
  const send = useMutation({
    mutationFn: () =>
      b2b<ManualTopUp>("/wallet/manual-top-ups", {
        method: "POST",
        body: { amountPaise: rupeesToPaise(f.rupees), method: f.method, utr: f.utr.trim(), paidOn: f.paidOn, note: f.note.trim() || null },
      }),
    onSuccess: () => {
      toast.success("Sent. We'll add it to your wallet once our finance team has checked it.");
      setF((x) => ({ ...x, rupees: "", utr: "", note: "" }));
      void qc.invalidateQueries({ queryKey: ["b2b", "wallet", "manual"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const paise = rupeesToPaise(f.rupees);
  const ok = paise !== null && paise >= 10_000 && /^[A-Za-z0-9]{6,30}$/.test(f.utr.trim());
  return (
    <div className={card}>
      <p className="mb-1 font-semibold text-slate-900">Bank transfer (NEFT / RTGS / IMPS / UPI)</p>
      <p className="mb-2 whitespace-pre-line text-[12px] text-slate-600">
        {list.data?.bankDetails ? `Send money to:\n${list.data.bankDetails}` : "For our bank details, write to care@musafirbaba.com or call +91 92896 02447."}
      </p>
      {canTopUp && (
        <div className="grid gap-2 sm:grid-cols-5">
          <input inputMode="decimal" value={f.rupees} onChange={(e) => setF({ ...f, rupees: e.target.value })} placeholder="Amount ₹" className={input} aria-label="Amount in rupees" />
          <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as (typeof TRANSFER_METHODS)[number] })} className={input} aria-label="Method">
            {TRANSFER_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input value={f.utr} onChange={(e) => setF({ ...f, utr: e.target.value })} placeholder="UTR / reference" className={input} aria-label="UTR" />
          <input type="date" max={today()} value={f.paidOn} onChange={(e) => setF({ ...f, paidOn: e.target.value })} className={input} aria-label="Date sent" />
          <button disabled={!ok || send.isPending} onClick={() => send.mutate()} className={button}>{send.isPending ? "Sending…" : "Tell us"}</button>
        </div>
      )}
      {(list.data?.data.length ?? 0) > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 text-[13px]">
          {list.data?.data.slice(0, 10).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="text-slate-600">{t.paidOn}</span>
              <span className="font-mono text-[12px] text-slate-500">{t.method} {t.utr}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${t.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : t.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{MANUAL_LABEL[t.status]}</span>
              {t.status === "REJECTED" && t.decisionNote && <span className="text-[12px] text-slate-500">{t.decisionNote}</span>}
              <span className="ml-auto font-medium text-slate-900">{inr(t.amountPaise)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OnlineTopUps() {
  const q = useQuery({ queryKey: ["b2b", "wallet", "top-ups"], queryFn: () => b2b<{ data: TopUp[] }>("/wallet/top-ups") });
  if (!q.data?.data.length) return null;
  return (
    <div className={card}>
      <p className="mb-1 font-semibold text-slate-900">Online payments</p>
      <ul className="divide-y divide-slate-100 text-[13px]">
        {q.data.data.map((t) => (
          <li key={t.txnId} className="flex items-center gap-2 py-1.5">
            <span className="text-slate-600">{dateText(t.createdAt)}</span>
            <span className="font-mono text-[12px] text-slate-500">{t.txnId}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{topUpLabel(t)}</span>
            <span className="ml-auto font-medium text-slate-900">{inr(t.amountPaise)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Statement() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(today);
  const q = useQuery({ queryKey: ["b2b", "wallet", "statement", from, to], queryFn: () => b2b<WalletStatement>(`/wallet/statement?from=${from}&to=${to}`) });
  async function download() {
    const get = (token: string | null) => fetch(`${B2B_API}/wallet/statement.csv?from=${from}&to=${to}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
    try {
      let res = await get(useBusinessSession.getState().accessToken);
      if (res.status === 401) res = await get(await refreshBusinessSession());
      if (!res.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `musafirbaba-wallet-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const s = q.data;
  return (
    <div className={card}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <p className="mr-auto font-semibold text-slate-900">Statement</p>
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2" /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2" /></label>
        <button onClick={download} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5"><Download size={14} /> CSV</button>
      </div>
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {s && (
        <div className="text-[13px]">
          <p className="flex justify-between border-b border-slate-100 py-1.5 text-slate-600"><span>Opening balance ({s.from})</span><span>{inr(s.openingPaise)}</span></p>
          {s.lines.length === 0 && <p className="py-4 text-center text-slate-500">Nothing in this period.</p>}
          {s.lines.map((l, i) => (
            <div key={`${l.reference}-${i}`} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1.5">
              <span className="w-28 text-slate-500">{dateText(l.at)}</span>
              <span className="text-slate-800">{l.description}</span>
              {l.memo && <span className="text-[12px] text-slate-500">{l.memo}</span>}
              <span className={`ml-auto font-medium ${l.amountPaise < 0 ? "text-slate-900" : "text-emerald-700"}`}>{l.amountPaise > 0 ? "+" : ""}{inr(l.amountPaise)}</span>
              <span className="w-28 text-right text-slate-500">{inr(l.balancePaise)}</span>
            </div>
          ))}
          <p className="flex justify-between py-1.5 font-medium text-slate-900"><span>Closing balance ({s.to})</span><span>{inr(s.closingPaise)}</span></p>
        </div>
      )}
    </div>
  );
}

export function LowBalanceSetting({ wallet, canChange }: { wallet: Wallet; canChange: boolean }) {
  const qc = useQueryClient();
  const [rupees, setRupees] = useState(String(wallet.lowBalanceThresholdPaise / 100));
  const save = useMutation({
    mutationFn: (paise: number) => b2b<Wallet>("/wallet/settings", { method: "PATCH", body: { lowBalanceThresholdPaise: paise } }),
    onSuccess: (w) => {
      qc.setQueryData(["b2b", "wallet"], w);
      toast.success(w.lowBalanceThresholdPaise > 0 ? `We'll tell you when less than ${inr(w.lowBalanceThresholdPaise)} is available.` : "Low-balance alerts are off.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const paise = rupeesToPaise(rupees);
  return (
    <div className={`${card} text-[13px]`}>
      <p className="mb-1 font-semibold text-slate-900">Low-balance alert</p>
      <p className="mb-2 text-slate-600">We notify your owners (bell and email) when less than this is available. 0 turns it off.</p>
      <div className="flex items-center gap-2">
        <span>₹</span>
        <input disabled={!canChange} inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} className={`${input} w-40`} aria-label="Alert below, in rupees" />
        {canChange && <button disabled={paise === null || save.isPending} onClick={() => paise !== null && save.mutate(paise)} className={button}>Save</button>}
      </div>
    </div>
  );
}
