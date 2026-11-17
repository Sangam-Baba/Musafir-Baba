"use client";
// Calendar files: download the template, choose a file, check it (every problem by line and column), then apply.
// Uses GET …/calendar-imports/template and POST …/calendar-imports (text/csv) — the file is never stored as such.
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { B2B_API, B2BError, refreshBusinessSession } from "../../api";
import { newRequestId, rupees } from "../../inventory";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import { Panel } from "../portal/ui";

type Report = {
  ok: boolean;
  dryRun: boolean;
  changeId?: string;
  rows: number;
  roomNights?: number;
  rateNights?: number;
  refused?: { date: string; booked: number; held: number }[];
  warnings?: { date: string; from: number; to: number }[];
  errors: { line: number; column: string; code: string }[];
};

const ROW_TEXT: Record<string, string> = {
  COLUMN_UNKNOWN: "Unknown column",
  COLUMN_MISSING: "Missing column",
  COLUMN_REPEATED: "A column appears twice",
  DATE_INVALID: "Not a real date (use YYYY-MM-DD)",
  DATE_PAST: "Date in the past",
  DATE_BEYOND_WINDOW: "More than a year ahead",
  ROOM_TYPE_UNKNOWN: "Unknown room type",
  RATE_PLAN_UNKNOWN: "Unknown rate plan",
  ROOM_TYPE_NOT_IN_PLAN: "The plan doesn't sell this room type",
  ROOMS_INVALID: "Rooms must be a whole number 0–999",
  YES_NO_INVALID: "Use yes or no",
  PRICE_INVALID: "Price must be rupees, at least ₹1",
  PRICE_COLUMN_NOT_FOR_PLAN: "This price column doesn't fit the plan",
  PRICES_COME_FROM_PARENT: "This plan's prices follow another plan",
  RATE_PLAN_REQUIRED: "Give a rate plan for prices and rules",
  STAY_INVALID: "Stay must be 1–30 nights",
  STAY_LIMITS_ORDER: "Minimum stay is above maximum stay",
  NOTHING_TO_CHANGE: "Nothing to change on this row",
  ROW_REPEATED: "The same night appears twice",
};

/** A CSV request with the session (the shared helper only sends JSON). */
async function send(path: string, init: { method?: string; body?: string }) {
  const go = (token: string | null) =>
    fetch(`${B2B_API}${path}`, { method: init.method ?? "GET", headers: { "X-B2B-Auth": "1", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body ? { "Content-Type": "text/csv" } : {}) }, credentials: "include", body: init.body });
  let res = await go(useBusinessSession.getState().accessToken);
  if (res.status === 401) res = await go(await refreshBusinessSession());
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new B2BError(res.status, data?.code ?? `HTTP_${res.status}`, data?.title ?? "Request failed", data ?? {});
  }
  return res;
}

export function ImportPanel({ propertyId, onApplied }: { propertyId: string; onApplied: () => void }) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [confirmBig, setConfirmBig] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = `/hotel/properties/${propertyId}/calendar-imports`;

  async function template() {
    try {
      const res = await send(`${base}/template`, {});
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "calendar-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function run(apply: boolean) {
    if (!csv) return;
    setBusy(true);
    try {
      const q = apply ? `?dryRun=false&requestId=${newRequestId()}${confirmBig ? "&confirmBigChange=true" : ""}` : "?dryRun=true";
      const r = (await (await send(`${base}${q}`, { method: "POST", body: csv })).json()) as Report;
      setReport(r);
      if (apply && r.changeId) {
        toast.success(`File applied — ${(r.roomNights ?? 0) + (r.rateNights ?? 0)} night(s) changed`);
        setCsv(null);
        setFileName("");
        onApplied();
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const clean = report && report.ok && report.dryRun;
  return (
    <Panel icon={FileSpreadsheet} title="Import a calendar file" subtitle="One row per night. Blank cells mean no change. Prices in rupees, before tax.">
      <div className="space-y-3 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={template} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-[#FE5300]">Download template</button>
          <label className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-[#FE5300]">
            Choose file
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 4 * 1024 * 1024) return toast.error("The file is larger than 4 MB");
                setCsv(await f.text());
                setFileName(f.name);
                setReport(null);
                setConfirmBig(false);
              }}
            />
          </label>
          {fileName && <span className="text-slate-500">{fileName}</span>}
          <button type="button" disabled={!csv || busy} onClick={() => run(false)} className="rounded-md border border-[#FE5300] px-3 py-1.5 font-medium text-[#FE5300] disabled:opacity-50">Check file</button>
          <button type="button" disabled={!clean || busy || ((report?.warnings?.length ?? 0) > 0 && !confirmBig)} onClick={() => run(true)} className="rounded-md bg-[#FE5300] px-3 py-1.5 font-medium text-white disabled:opacity-50">{busy ? "Working…" : "Apply file"}</button>
        </div>
        {report && !report.ok && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="font-medium text-red-800">{report.errors.length} problem(s) in {report.rows} row(s) — nothing was saved.</p>
            <table className="mt-2 w-full text-xs">
              <thead><tr className="text-left text-red-700"><th className="py-1">Line</th><th>Column</th><th>Problem</th></tr></thead>
              <tbody>
                {report.errors.slice(0, 200).map((e, i) => (
                  <tr key={i} className="border-t border-red-100"><td className="py-1">{e.line}</td><td>{e.column || "—"}</td><td>{ROW_TEXT[e.code] ?? e.code}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {clean && (
          <div className="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <p>The file is fine: {report.rows} row(s) — {report.roomNights} room night(s), {report.rateNights} price / rule night(s).</p>
            {(report.refused?.length ?? 0) > 0 && <p className="text-amber-800">Kept (guests booked): {report.refused?.map((r) => r.date).join(", ")}</p>}
            {(report.warnings?.length ?? 0) > 0 && (
              <div className="text-red-700">
                <p>Prices moving more than 50 %: {report.warnings?.slice(0, 5).map((w) => `${w.date}: ${rupees(w.from)} → ${rupees(w.to)}`).join(", ")}</p>
                <label className="mt-1 flex items-center gap-1.5"><input type="checkbox" checked={confirmBig} onChange={(e) => setConfirmBig(e.target.checked)} /> Yes, these prices are right</label>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
