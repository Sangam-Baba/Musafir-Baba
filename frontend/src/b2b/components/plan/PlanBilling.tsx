"use client";
// Client "Plan & Billing" (Stage 13): the plan and how much of this month's queries are used (with a forecast), the
// plans on offer with a preview before changing, cancel at period end, and invoices (open, or pay an unpaid one by PayU).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b, B2B_API, refreshBusinessSession } from "../../api";
import { submitPayuForm, type PayuForm } from "../../finance";
import { errorMessage } from "../../messages";
import { STATUS_TEXT, type ChangePreview, type MySubscription, type Plan, type SaasInvoice } from "../../plan";
import { useBusinessSession } from "../../session-store";
import { idempotencyKey } from "../../wallet";
import { inr } from "../../website/hotels";

const card = "rounded-xl border border-slate-200 bg-white p-4";

function Usage({ s }: { s: MySubscription }) {
  const pct = Math.min(100, s.percent);
  const tone = s.percent >= 100 ? "bg-red-500" : s.percent >= 80 ? "bg-amber-500" : "bg-[#FE5300]";
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <p className="text-base font-semibold text-slate-900">{s.planName}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.status === "ACTIVE" || s.status === "TRIAL" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{STATUS_TEXT[s.status]}</span>
        <span className="ml-auto text-slate-600">{s.pricePaise > 0 ? `${inr(s.pricePaise)} / month + GST` : "Free"}</span>
      </div>
      <p className="mt-3 text-[13px] text-slate-700"><b>{s.used.toLocaleString("en-IN")}</b> of {s.allowance.toLocaleString("en-IN")} queries used this month ({s.percent}%)</p>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${tone}`} style={{ width: `${pct}%` }} /></div>
      <p className="mt-1.5 text-[12px] text-slate-500">
        On this pace about {s.forecast.toLocaleString("en-IN")} by month end. {s.limitBehaviour === "BLOCK" ? "At the limit searching stops until next month (bookings always work)." : `Above the limit each query costs ${inr(s.overagePricePerQueryPaise)}.`}
      </p>
      {s.trialEndsAt && <p className="mt-1 text-[12px] text-slate-500">Trial ends {new Date(s.trialEndsAt).toLocaleDateString("en-IN")}.</p>}
      {s.pending && <p className="mt-1 text-[12px] text-amber-700">{s.pending.action === "CANCEL" ? "Cancels at the end of this month." : `Moves to ${s.pending.planKey} next month.`}</p>}
      {(s.status === "PAST_DUE" || s.status === "SUSPENDED") && <p className="mt-2 rounded-lg bg-red-50 p-2 text-[12px] text-red-800">An invoice is unpaid. Add money to your wallet (it is taken automatically) or pay it below{s.status === "SUSPENDED" ? " — searching and new bookings are paused until then" : ""}.</p>}
    </div>
  );
}

function Plans({ s, plans, canChange }: { s: MySubscription; plans: Plan[]; canChange: boolean }) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [busy, setBusy] = useState(false);
  async function ask(planKey: string) {
    try {
      setPreview(await b2b<ChangePreview>("/subscription/change-preview", { method: "POST", body: { planKey } }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function confirm() {
    if (!preview) return;
    setBusy(true);
    try {
      await b2b("/subscription/change", { method: "POST", body: { planKey: preview.planKey, expectedVersion: preview.version } });
      toast.success(preview.kind === "UPGRADE" ? `You're on ${preview.planName} now` : `${preview.planName} starts next month`);
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ["b2b"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.filter((p) => p.key !== "STARTER" || s.planKey === "STARTER").map((p) => (
          <div key={p.key} className={`${card} ${p.key === s.planKey ? "border-[#FE5300] ring-1 ring-[#FE5300]/30" : ""}`}>
            <p className="font-semibold text-slate-900">{p.name}</p>
            <p className="text-lg font-bold text-slate-900">{p.pricePaise > 0 ? inr(p.pricePaise) : "Free"}<span className="text-[12px] font-normal text-slate-500">{p.pricePaise > 0 ? " / month + GST" : ` for ${p.trialDays} days`}</span></p>
            <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
              <li className="flex gap-1.5"><Check size={13} className="text-emerald-600" />{p.monthlyQueryLimit.toLocaleString("en-IN")} queries a month</li>
              <li className="flex gap-1.5"><Check size={13} className="text-emerald-600" />{p.limitBehaviour === "OVERAGE" ? `then ${inr(p.overagePricePerQueryPaise)} a query` : "stops at the limit"}</li>
              <li className="flex gap-1.5"><Check size={13} className="text-emerald-600" />{p.features.users} users · {p.features.branches} branches{p.features.api ? " · API" : ""}</li>
            </ul>
            {canChange && p.key !== s.planKey && p.key !== "STARTER" && <button onClick={() => ask(p.key)} className="mt-3 w-full rounded-lg border border-slate-300 py-1.5 text-[13px] font-medium hover:border-[#FE5300] hover:text-[#FE5300]">Choose</button>}
            {p.key === s.planKey && <p className="mt-3 text-center text-[12px] font-medium text-[#FE5300]">Your plan</p>}
          </div>
        ))}
      </div>
      {preview && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 text-[13px]">
          {preview.kind === "UPGRADE" ? (
            <p>Move to <b>{preview.planName}</b> now: {inr(preview.chargeNowPaise)} + GST for the rest of this month (taken from your wallet), {preview.includedQueries.toLocaleString("en-IN")} queries this month.</p>
          ) : (
            <p>Move to <b>{preview.planName}</b> from next month. Nothing changes until then.</p>
          )}
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={confirm} className="rounded-lg bg-[#FE5300] px-4 py-1.5 font-semibold text-white disabled:opacity-50">Confirm</button>
            <button onClick={() => setPreview(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">Not now</button>
          </div>
        </div>
      )}
    </div>
  );
}

async function openInvoice(id: string) {
  const get = (token: string | null) => fetch(`${B2B_API}/billing/invoices/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
  try {
    let res = await get(useBusinessSession.getState().accessToken);
    if (res.status === 401) res = await get(await refreshBusinessSession());
    if (!res.ok) throw new Error("Could not open the invoice");
    window.open(URL.createObjectURL(await res.blob()), "_blank", "noopener");
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

function Invoices({ canPay }: { canPay: boolean }) {
  const q = useQuery({ queryKey: ["b2b", "saas-invoices"], queryFn: () => b2b<{ data: SaasInvoice[] }>("/billing/invoices") });
  async function pay(id: string) {
    try {
      submitPayuForm(await b2b<PayuForm>(`/billing/invoices/${id}/pay`, { method: "POST", body: {}, headers: { "Idempotency-Key": idempotencyKey() } }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className={card}>
      <p className="mb-2 font-semibold text-slate-900">Invoices</p>
      {q.data?.data.length === 0 && <p className="text-[13px] text-slate-500">No invoices yet.</p>}
      {q.data?.data.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-2 text-[13px]">
          <span className="font-mono text-[12px] text-slate-600">{i.number}</span>
          <span className="text-slate-600">{i.period}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${i.status === "PAID" ? "bg-emerald-50 text-emerald-700" : i.status === "UNPAID" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{i.status === "PAID" ? "Paid" : i.status === "UNPAID" ? "Unpaid" : i.status}</span>
          <span className="ml-auto font-medium">{inr(i.totals.totalPaise)}</span>
          <button onClick={() => openInvoice(i.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1"><FileText size={13} /> View</button>
          {canPay && i.status === "UNPAID" && <button onClick={() => pay(i.id)} className="rounded-lg bg-[#FE5300] px-3 py-1 font-medium text-white">Pay by PayU</button>}
        </div>
      ))}
    </div>
  );
}

export function PlanBilling({ canChange }: { canChange: boolean }) {
  const qc = useQueryClient();
  const sub = useQuery({ queryKey: ["b2b", "subscription"], queryFn: () => b2b<MySubscription>("/subscription") });
  const plans = useQuery({ queryKey: ["b2b", "plans"], queryFn: () => b2b<{ data: Plan[] }>("/plans") });
  async function cancel(undo: boolean) {
    try {
      await b2b("/subscription/cancel", { method: "POST", body: { undo } });
      toast.success(undo ? "Your plan continues" : "Your plan ends at the end of this month");
      void qc.invalidateQueries({ queryKey: ["b2b", "subscription"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  if (sub.error) return <p className="text-[13px] text-red-700">{errorMessage(sub.error)}</p>;
  if (!sub.data) return null;
  return (
    <div className="space-y-4">
      <Usage s={sub.data} />
      {plans.data && <Plans s={sub.data} plans={plans.data.data} canChange={canChange} />}
      <Invoices canPay={canChange} />
      {canChange && sub.data.status !== "CANCELLED" && (
        <p className="text-[12px] text-slate-500">
          {sub.data.pending?.action === "CANCEL" ? <button onClick={() => cancel(true)} className="text-[#FE5300] underline">Keep my plan</button> : <button onClick={() => cancel(false)} className="underline">Cancel at the end of this month</button>}
        </p>
      )}
    </div>
  );
}
