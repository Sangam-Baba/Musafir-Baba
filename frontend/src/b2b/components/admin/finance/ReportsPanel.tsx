"use client";
// Finance → GST & reports (Stage 15): the month's GST register (hotel invoices − credit notes + plan invoices; B2B /
// B2C, place of supply, SAC) with CSV and the month lock after filing; the management reports with CSV; and the
// accounting export (every journal line by day) for Tally / Zoho.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, BookOpen, Download, Loader2, Lock, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../../messages";
import { adminDownload, columnLabel, indiaDay, indiaMonth, type GstGroup, type GstRegister, type ReportResult } from "../../../payouts";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

const Spinner = () => <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>;
const KIND: Record<string, string> = { HOTEL_INVOICE: "Hotel invoice", HOTEL_CREDIT_NOTE: "Credit note", SAAS_INVOICE: "Plan invoice" };
const REPORTS: { key: string; label: string; ranged: boolean; groupBy?: boolean }[] = [
  { key: "sales", label: "Sales", ranged: true },
  { key: "clients", label: "By client", ranged: true },
  { key: "hotels", label: "By hotel", ranged: true },
  { key: "destinations", label: "By destination", ranged: true },
  { key: "margin", label: "Margin", ranged: true, groupBy: true },
  { key: "cancellations", label: "Cancellations", ranged: true },
  { key: "payments", label: "Payments", ranged: true },
  { key: "wallets", label: "Wallets & credit", ranged: false },
  { key: "payables-ageing", label: "Owed to hotels", ranged: false },
  { key: "plan-revenue", label: "Plan revenue", ranged: true },
  { key: "usage", label: "Usage", ranged: true },
];

function Cell({ column, value }: { column: string; value: unknown }) {
  if (column.endsWith("Paise") && typeof value === "number") return <span className="font-mono">{inr(value)}</span>;
  if (column.endsWith("Pct") && typeof value === "number") return <span className="font-mono">{value} %</span>;
  return <span>{value === null || value === undefined || value === "" ? "—" : String(value)}</span>;
}

function Groups({ title, g }: { title: string; g: GstGroup }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 text-[12px]">
      <p className="mb-1 font-medium text-slate-700">{title}</p>
      {Object.entries(g).map(([k, v]) => (
        <p key={k} className="flex gap-2 text-slate-600"><span className="w-32 truncate">{KIND[k] ?? k}</span><span className="ml-auto font-mono">{inr(v.taxablePaise)}</span><span className="w-24 text-right font-mono text-slate-500">GST {inr(v.gstPaise)}</span></p>
      ))}
      {Object.keys(g).length === 0 && <p className="text-slate-400">—</p>}
    </div>
  );
}

function GstRegisterPanel({ token }: { token: string }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => indiaMonth(-1));
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["b2b-admin", "gst", month], queryFn: () => adminCall<GstRegister>(`/admin/gst-registers?month=${month}`, token) });
  const r = q.data;
  async function lock() {
    const note = window.prompt(`Lock ${month}? Do this only after the GST return for ${month} is filed — no document can be dated in it again. Note (e.g. "GSTR-1 filed on …"):`);
    if (note === null) return;
    setBusy(true);
    try {
      await adminCall(`/admin/periods/${month}/lock`, token, { method: "POST", body: { note: note.trim() || null } });
      toast.success(`${month} locked`);
      void qc.invalidateQueries({ queryKey: ["b2b-admin", "gst", month] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function csv() {
    try {
      await adminDownload(`/admin/gst-registers?month=${month}&format=csv`, token, `gst-register-${month}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <FleetPanel
      title="GST register"
      description="Hotel tax invoices minus credit notes, plus plan invoices, for the month (India time). The CSV layout is simple until the CA agrees the format."
      icon={Receipt}
      bodyClassName="p-0"
      actions={
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2 text-[12px]" />
          <SecondaryBtn onClick={csv}><Download className="h-3.5 w-3.5" /> CSV</SecondaryBtn>
          {r && !r.locked && <SecondaryBtn disabled={busy} onClick={lock}><Lock className="h-3.5 w-3.5" /> Lock month</SecondaryBtn>}
        </div>
      }
    >
      {q.isLoading && <Spinner />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {r && (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            {r.locked ? <FleetPill className={fleetTone.slate}>Locked by {r.locked.by} on {new Date(r.locked.at).toLocaleDateString("en-IN")}</FleetPill> : <FleetPill className={fleetTone.amber}>Open</FleetPill>}
            <span>Taxable <b className="font-mono">{inr(r.totals.taxablePaise)}</b></span>
            <span>CGST <b className="font-mono">{inr(r.totals.cgstPaise)}</b></span>
            <span>SGST <b className="font-mono">{inr(r.totals.sgstPaise)}</b></span>
            <span>IGST <b className="font-mono">{inr(r.totals.igstPaise)}</b></span>
            <span>Total <b className="font-mono">{inr(r.totals.totalPaise)}</b></span>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <Groups title="By type" g={r.byKind} />
            <Groups title="B2B / B2C" g={r.bySupplyType} />
            <Groups title="Place of supply (state code)" g={r.byPlaceOfSupply} />
            <Groups title="SAC" g={r.bySac} />
          </div>
          {r.rows.length === 0 && <FleetEmptyState icon={Receipt} title="No tax documents in this month" />}
          {r.rows.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500"><tr>{["Type", "Number", "Date", "Buyer GSTIN", "POS", "SAC", "Taxable", "GST", "Total"].map((h) => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {r.rows.map((x) => (
                    <tr key={`${x.kind}-${x.number}`}>
                      <td className="px-2 py-1">{KIND[x.kind] ?? x.kind}</td>
                      <td className="px-2 py-1 font-mono">{x.number}{x.against ? ` (on ${x.against})` : ""}</td>
                      <td className="px-2 py-1">{new Date(x.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-2 py-1 font-mono">{x.buyerGstin ?? "B2C"}</td>
                      <td className="px-2 py-1">{x.placeOfSupply}</td>
                      <td className="px-2 py-1">{x.sac}</td>
                      <td className="px-2 py-1 text-right font-mono">{inr(x.taxablePaise)}</td>
                      <td className="px-2 py-1 text-right font-mono">{inr(x.cgstPaise + x.sgstPaise + x.igstPaise)}</td>
                      <td className="px-2 py-1 text-right font-mono">{inr(x.totalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </FleetPanel>
  );
}

function Reports({ token }: { token: string }) {
  const [name, setName] = useState("sales");
  const [from, setFrom] = useState(() => `${indiaMonth()}-01`);
  const [to, setTo] = useState(() => indiaDay());
  const [by, setBy] = useState<"month" | "day">("month");
  const [groupBy, setGroupBy] = useState<"client" | "hotel" | "destination">("client");
  const def = REPORTS.find((r) => r.key === name) ?? REPORTS[0];
  const query = `from=${from}&to=${to}${name === "sales" ? `&by=${by}` : ""}${def?.groupBy ? `&groupBy=${groupBy}` : ""}`;
  const q = useQuery({ queryKey: ["b2b-admin", "reports", name, query], queryFn: () => adminCall<ReportResult>(`/admin/reports/${name}?${query}`, token), retry: false });
  async function csv() {
    try {
      await adminDownload(`/admin/reports/${name}?${query}&format=csv`, token, `${name}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const r = q.data;
  return (
    <FleetPanel title="Reports" description="Sold bookings only (never-confirmed ones left out); an order's refund counted once. Margin = what the buyer paid after refunds − what the hotel is owed." icon={BarChart3} bodyClassName="p-0">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
        {REPORTS.map((x) => (
          <button key={x.key} onClick={() => setName(x.key)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${name === x.key ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{x.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-[12px] text-slate-600">
        {def?.ranged !== false && (
          <>
            <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2" /></label>
            <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2" /></label>
          </>
        )}
        {name === "sales" && (
          <select value={by} onChange={(e) => setBy(e.target.value as "month" | "day")} className="h-8 rounded-md border border-slate-200 px-2"><option value="month">By month</option><option value="day">By day</option></select>
        )}
        {def?.groupBy && (
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "client" | "hotel" | "destination")} className="h-8 rounded-md border border-slate-200 px-2"><option value="client">By client</option><option value="hotel">By hotel</option><option value="destination">By destination</option></select>
        )}
        {def?.ranged === false && <span>As of now</span>}
        <span className="ml-auto"><SecondaryBtn onClick={csv}><Download className="h-3.5 w-3.5" /> CSV</SecondaryBtn></span>
      </div>
      {q.isLoading && <Spinner />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {r && r.rows.length === 0 && <FleetEmptyState icon={BarChart3} title="Nothing in this period" />}
      {r && r.rows.length > 0 && (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-500"><tr>{r.columns.map((c) => <th key={c} className="px-3 py-1.5 font-medium">{columnLabel(c)}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {r.rows.map((row, i) => (
                <tr key={i}>{r.columns.map((c) => <td key={c} className={`px-3 py-1.5 ${c.endsWith("Paise") || typeof row[c] === "number" ? "text-right" : ""}`}><Cell column={c} value={row[c]} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FleetPanel>
  );
}

function JournalExport({ token }: { token: string }) {
  const [from, setFrom] = useState(() => indiaDay(-1));
  const [to, setTo] = useState(() => indiaDay(-1));
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      await adminDownload(`/admin/exports/journal?from=${from}&to=${to}`, token, `journal-${from}-to-${to}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FleetPanel title="Accounting export" description="Every bookkeeping line for the days chosen (up to 31), for the accountant to import into Tally or Zoho. Each entry's debits equal its credits." icon={BookOpen}>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
        <label>From <Input type="date" className={`${inputSm} inline-block w-40`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <Input type="date" className={`${inputSm} inline-block w-40`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <PrimaryBtn disabled={busy} onClick={download}><Download className="h-3.5 w-3.5" /> Download CSV</PrimaryBtn>
      </div>
    </FleetPanel>
  );
}

export function ReportsPanel({ token, view }: { token: string; view: "gst" | "reports" }) {
  if (view === "gst") return <GstRegisterPanel token={token} />;
  return (
    <div className="space-y-3">
      <Reports token={token} />
      <JournalExport token={token} />
    </div>
  );
}
