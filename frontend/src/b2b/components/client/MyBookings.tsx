"use client";
// My Bookings for B2B clients (Stage 12 part B): the company's hotel bookings (other products "coming soon"), filters,
// CSV download, and a link to each order. Branch-limited people see their branches only (the server decides).
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { b2b, B2B_API, refreshBusinessSession } from "../../api";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import type { BookingRow } from "../../website/checkout";
import { inr } from "../../website/hotels";

const TABS = ["Hotels", "Flights", "Packages", "Transfers", "Activities"] as const;
const STATUS = ["", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "HOTEL_FAILED", "HELD", "FAILED"] as const;
const PAYMENT = ["", "PAID", "UNPAID", "PARTLY_REFUNDED", "REFUNDED"] as const;
const LABEL: Record<string, string> = { CONFIRMED: "Confirmed", CANCELLED: "Cancelled", COMPLETED: "Stay over", NO_SHOW: "No-show", HOTEL_FAILED: "Hotel couldn't honour", HELD: "Waiting for payment", FAILED: "Not booked", PAID: "Paid", UNPAID: "Not paid", PARTLY_REFUNDED: "Part refunded", REFUNDED: "Refunded" };
const field = "h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px]";

type Filters = { q: string; status: string; payment: string; destination: string; checkInFrom: string; checkInTo: string; bookedFrom: string; bookedTo: string };
const EMPTY: Filters = { q: "", status: "", payment: "", destination: "", checkInFrom: "", checkInTo: "", bookedFrom: "", bookedTo: "" };
const queryOf = (f: Filters) => new URLSearchParams(Object.entries(f).filter(([, v]) => v.trim() !== "")).toString();

export function MyBookings({ canExport }: { canExport: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Hotels");
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [f, setF] = useState<Filters>(EMPTY);
  const qs = queryOf(f);
  const q = useQuery({ queryKey: ["b2b", "my-bookings", qs], queryFn: () => b2b<{ data: (BookingRow & { branchId: string | null; createdBy: string | null })[] }>(`/client/bookings${qs ? `?${qs}` : ""}`), enabled: tab === "Hotels" });

  async function download() {
    const get = (token: string | null) => fetch(`${B2B_API}/client/bookings.csv${qs ? `?${qs}` : ""}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
    try {
      let res = await get(useBusinessSession.getState().accessToken);
      if (res.status === 401) res = await get(await refreshBusinessSession());
      if (!res.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "musafirbaba-bookings.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md border px-3 py-1 text-[12px] ${tab === t ? "border-[#FE5300] bg-orange-50 font-medium text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>{t}</button>
        ))}
      </div>
      {tab !== "Hotels" ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-[13px] text-slate-500">{tab} — coming soon.</p>
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); setF(draft); }} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-600">
            <label className="flex flex-col">Booking ID or guest<input className={`${field} w-44`} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="MBH-… / name" /></label>
            <label className="flex flex-col">Destination<input className={`${field} w-32`} value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} /></label>
            <label className="flex flex-col">Status<select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s ? LABEL[s] : "Any"}</option>)}</select></label>
            <label className="flex flex-col">Payment<select className={field} value={draft.payment} onChange={(e) => setDraft({ ...draft, payment: e.target.value })}>{PAYMENT.map((s) => <option key={s} value={s}>{s ? LABEL[s] : "Any"}</option>)}</select></label>
            <label className="flex flex-col">Check-in from<input type="date" className={field} value={draft.checkInFrom} onChange={(e) => setDraft({ ...draft, checkInFrom: e.target.value })} /></label>
            <label className="flex flex-col">to<input type="date" className={field} value={draft.checkInTo} onChange={(e) => setDraft({ ...draft, checkInTo: e.target.value })} /></label>
            <label className="flex flex-col">Booked from<input type="date" className={field} value={draft.bookedFrom} onChange={(e) => setDraft({ ...draft, bookedFrom: e.target.value })} /></label>
            <label className="flex flex-col">to<input type="date" className={field} value={draft.bookedTo} onChange={(e) => setDraft({ ...draft, bookedTo: e.target.value })} /></label>
            <button className="flex h-8 items-center gap-1 rounded-lg bg-[#FE5300] px-3 font-medium text-white"><Search size={13} /> Search</button>
            <button type="button" onClick={() => { setDraft(EMPTY); setF(EMPTY); }} className="h-8 rounded-lg border border-slate-200 px-3">Clear</button>
            {canExport && <button type="button" onClick={download} className="ml-auto flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3"><Download size={13} /> CSV</button>}
          </form>
          {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {q.data?.data.length === 0 && <p className="p-6 text-center text-[13px] text-slate-500">No bookings match.</p>}
            {q.data?.data.map((r) => (
              <Link key={r.bookingRef} href={`/business/orders/${encodeURIComponent(r.orderRef)}`} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-[13px] last:border-0 hover:bg-slate-50">
                <span className="font-mono text-[12px] text-slate-600">{r.bookingRef}</span>
                <span className="font-medium text-slate-900">{r.propertyName ?? "—"}</span>
                <span className="text-slate-600">{r.destination ?? ""}</span>
                <span className="text-slate-600">{r.leadGuest ?? ""}</span>
                <span className="text-slate-600">{r.checkIn} → {r.checkOut}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.bookingStatus === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{LABEL[r.bookingStatus] ?? r.bookingStatus}</span>
                <span className="text-[11px] text-slate-500">{LABEL[r.paymentState] ?? r.paymentState}</span>
                <span className="ml-auto font-medium text-slate-900">{inr(r.totalPaise)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
