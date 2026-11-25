"use client";
// The bus e-ticket (Stage 18 B6): PNR, bus company and bus, journey with times (Indian time), seats with passengers,
// and the price paid with GST. Printable from the browser.
import { BusFront, Printer } from "lucide-react";

import { GENDER_LABEL, istTime, KIND_LABEL, rupees, type BusTicketView } from "../../bus";

export function BusTicket({ t }: { t: BusTicketView }) {
  const confirmed = t.status === "CONFIRMED" || t.status === "COMPLETED";
  return (
    <div className="mt-2 rounded-lg border border-slate-200 p-3 text-[13px] print:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <BusFront className="h-5 w-5 text-[#FE5300]" />
        <p className="font-semibold text-slate-900">{t.operatorName}</p>
        <span className="text-slate-500">· {t.bus.acType === "AC" ? "AC" : "Non-AC"} {KIND_LABEL[t.bus.kind]} · {t.bus.regNo}</span>
        <span className="ml-auto font-mono text-[12px] text-slate-700">PNR {t.ref}</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <p><span className="block text-[11px] uppercase tracking-wide text-slate-500">Boarding</span><b>{t.from.name}</b> · {istTime(t.from.at)}</p>
        <p><span className="block text-[11px] uppercase tracking-wide text-slate-500">Getting off</span><b>{t.to.name}</b> · {istTime(t.to.at)}</p>
      </div>
      <table className="mt-2 w-full text-left text-[12px]">
        <thead className="text-slate-500"><tr><th className="font-medium">Seat</th><th className="font-medium">Passenger</th><th className="font-medium">Age</th><th className="font-medium">Gender</th></tr></thead>
        <tbody>{t.seats.map((s) => <tr key={s.no} className="border-t border-slate-100"><td className="py-1 font-medium">{s.no}</td><td>{s.passenger.name}</td><td>{s.passenger.age}</td><td>{GENDER_LABEL[s.passenger.gender]}</td></tr>)}</tbody>
      </table>
      <p className="mt-2 text-slate-600">Paid {rupees(t.price.totalPaise)} incl. GST {rupees(t.price.gstPaise)}. Reach the boarding point 15 minutes early and carry a photo ID.</p>
      {confirmed && <button type="button" onClick={() => window.print()} className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px] print:hidden"><Printer className="h-3.5 w-3.5" /> Print e-ticket</button>}
    </div>
  );
}
