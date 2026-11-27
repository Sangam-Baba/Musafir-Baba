"use client";
// Passenger details for picked bus seats (Stage 18 B6): name, age and gender per seat (women only on ladies seats),
// and the booking contact. "Book" holds the seats for 15 minutes at the price shown and opens the order to pay.
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { rupees, type BuyerSeat } from "../../bus";
import { errorMessage } from "../../messages";
import type { Me } from "../../types";
import { idempotencyKey } from "../../wallet";
import { inputCls } from "../listing/ui";

type Passenger = { name: string; age: string; gender: "" | "F" | "M" | "O" };

export function BusBookForm({ me, tripId, fromStopId, toStopId, seats, totalPaise }: { me: Me; tripId: string; fromStopId: string; toStopId: string; seats: BuyerSeat[]; totalPaise: number }) {
  const router = useRouter();
  const [people, setPeople] = useState<Record<string, Passenger>>({});
  const [contact, setContact] = useState({ name: me.user.name, email: me.user.email ?? "", phone: me.user.phone ?? "" });
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => idempotencyKey());
  const p = (no: string): Passenger => people[no] ?? { name: "", age: "", gender: "" };
  const set = (no: string, patch: Partial<Passenger>) => setPeople({ ...people, [no]: { ...p(no), ...patch } });
  async function book(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        tripId,
        fromStopId,
        toStopId,
        seats: seats.map((s) => ({ no: s.no, passenger: { name: p(s.no).name, age: Number(p(s.no).age), gender: p(s.no).gender } })),
        contact,
        expectedTotalPaise: totalPaise,
      };
      const order = await b2b<{ ref: string }>("/client/bus-orders", { method: "POST", body, headers: { "Idempotency-Key": key } });
      router.push(`/business/orders/${order.ref}`);
    } catch (err) {
      if (err instanceof B2BError && err.code === "PRICE_CHANGED") toast.error(`The price changed to ${rupees(Number((err.details as { totalPaise?: number }).totalPaise ?? 0))}. Check and book again.`);
      else toast.error(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={book} className="space-y-3 rounded-md border border-slate-200 p-3">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Passengers</p>
      {seats.map((s) => (
        <div key={s.no} className="grid grid-cols-[3rem_1fr_4.5rem_6.5rem] items-end gap-2">
          <span className="pb-2 text-[13px] font-semibold">{s.no}</span>
          <label className="text-[11px] text-slate-600">Name<input required minLength={2} maxLength={60} value={p(s.no).name} onChange={(e) => set(s.no, { name: e.target.value })} className={inputCls} /></label>
          <label className="text-[11px] text-slate-600">Age<input required type="number" min={1} max={120} value={p(s.no).age} onChange={(e) => set(s.no, { age: e.target.value })} className={inputCls} /></label>
          <label className="text-[11px] text-slate-600">Gender
            <select required value={p(s.no).gender} onChange={(e) => set(s.no, { gender: e.target.value as Passenger["gender"] })} className={inputCls}>
              <option value="">—</option>
              <option value="F">Female</option>
              {!s.ladies && <option value="M">Male</option>}
              {!s.ladies && <option value="O">Other</option>}
            </select>
          </label>
        </div>
      ))}
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Contact for this booking</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-slate-600">Name<input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inputCls} /></label>
        <label className="text-[11px] text-slate-600">Email<input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputCls} /></label>
        <label className="text-[11px] text-slate-600">Phone<input required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputCls} /></label>
      </div>
      <button disabled={busy} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Hold seats and pay {rupees(totalPaise)}
      </button>
      <p className="text-[11px] text-slate-500">Seats are held for 15 minutes while you pay from your wallet.</p>
    </form>
  );
}
