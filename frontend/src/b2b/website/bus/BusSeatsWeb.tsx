"use client";
// /buses/trip/[id]?from&to — the bus's seat map for the chosen boarding and getting-off stops, passenger details per
// seat (women only on ladies seats) and the contact; "Continue to payment" holds the seats for 15 minutes at the price
// shown (the server prices again — a changed price is shown, never charged silently) and opens the booking page.
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { B2BError } from "../../api";
import { istTime, type BuyerSeat } from "../../bus";
import { SeatMap, seatAt } from "../../components/bus/SeatMap";
import { errorMessage } from "../../messages";
import { randomId } from "../checkout";
import { inr } from "../hotels";
import { busSeatMap, createBusOrder } from "./busWeb";

const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FE5300]";
type P = { name: string; age: string; gender: "" | "F" | "M" | "O" };

function Passengers({ seats, people, setPerson }: { seats: BuyerSeat[]; people: Record<string, P>; setPerson: (no: string, p: Partial<P>) => void }) {
  return (
    <div className="space-y-2">
      {seats.map((s) => {
        const p = people[s.no] ?? { name: "", age: "", gender: "" };
        return (
          <div key={s.no} className="grid grid-cols-[3rem_1fr_5rem_7rem] items-end gap-2">
            <span className="pb-2 font-semibold">{s.no}</span>
            <label className="text-xs text-slate-600">Full name<input required minLength={2} maxLength={60} value={p.name} onChange={(e) => setPerson(s.no, { name: e.target.value })} className={field} /></label>
            <label className="text-xs text-slate-600">Age<input required type="number" min={1} max={120} value={p.age} onChange={(e) => setPerson(s.no, { age: e.target.value })} className={field} /></label>
            <label className="text-xs text-slate-600">Gender
              <select required value={p.gender} onChange={(e) => setPerson(s.no, { gender: e.target.value as P["gender"] })} className={field}>
                <option value="">—</option><option value="F">Female</option>{!s.ladies && <option value="M">Male</option>}{!s.ladies && <option value="O">Other</option>}
              </select>
            </label>
          </div>
        );
      })}
    </div>
  );
}

export function BusSeatsWeb() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const map = useQuery({ queryKey: ["bus-seat-map", id, from, to], queryFn: () => busSeatMap(id, from, to) });
  const [picked, setPicked] = useState<string[]>([]);
  const [people, setPeople] = useState<Record<string, P>>({});
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const requestKey = useRef(randomId());
  if (map.isError) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{errorMessage(map.error)}</p>;
  if (!map.data) return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;
  const m = map.data;
  const seats = m.decks.flatMap((d) => d.seats);
  const chosen = seats.filter((s) => picked.includes(s.no));
  const total = chosen.reduce((t, s) => t + (s.price?.totalPaise ?? 0), 0);
  const decks = m.decks.map((d) => ({ ...d, seats: d.seats.map((s) => ({ ...s, taken: s.available ? 0 : 1 })) }));
  const pick = (deckIndex: number, row: number, col: number) => {
    const d = m.decks[deckIndex];
    const s = d && (seatAt(d, row, col) as BuyerSeat | undefined);
    if (s?.available) setPicked(picked.includes(s.no) ? picked.filter((x) => x !== s.no) : [...picked, s.no].slice(0, 10));
  };
  async function book(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const o = await createBusOrder(
        { tripId: id, fromStopId: from, toStopId: to, seats: chosen.map((s) => ({ no: s.no, passenger: { name: people[s.no]?.name ?? "", age: Number(people[s.no]?.age), gender: (people[s.no]?.gender || "F") as "F" | "M" | "O" } })), contact, expectedTotalPaise: total },
        requestKey.current,
      );
      router.push(`/buses/booking/${o.ref}?key=${o.linkKey ?? ""}`);
    } catch (err) {
      if (err instanceof B2BError && err.code === "PRICE_CHANGED") toast.error(`The price changed to ${inr(Number((err.details as { totalPaise?: number }).totalPaise ?? 0))}. Check and continue again.`);
      else toast.error(errorMessage(err));
      requestKey.current = randomId();
      void map.refetch();
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-3">
        <p className="text-slate-700"><b>{m.from.name}</b> {istTime(m.from.at)} → <b>{m.to.name}</b> {istTime(m.to.at)}</p>
        <p className="text-sm text-slate-500">Tap seats to pick them (up to 10). Pink seats are for women only; grey seats are taken.</p>
        <SeatMap decks={decks} selected={picked} onCell={pick} />
      </div>
      <form onSubmit={book} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {chosen.length === 0 ? <p className="text-slate-500">Pick your seats on the left.</p> : (
          <>
            <p className="font-semibold text-slate-900">Passengers</p>
            <Passengers seats={chosen} people={people} setPerson={(no, p) => setPeople({ ...people, [no]: { ...(people[no] ?? { name: "", age: "", gender: "" }), ...p } })} />
            <p className="font-semibold text-slate-900">Contact (ticket goes here)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-xs text-slate-600">Name<input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={field} /></label>
              <label className="text-xs text-slate-600">Email<input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={field} /></label>
              <label className="text-xs text-slate-600">Mobile<input required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={field} /></label>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-slate-600">{chosen.length} seat{chosen.length > 1 ? "s" : ""} · incl. GST</span><b className="text-xl">{inr(total)}</b></div>
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FE5300] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue to payment</button>
            <p className="text-xs text-slate-500">Seats are held for 15 minutes while you pay with PayU.</p>
          </>
        )}
      </form>
    </div>
  );
}
