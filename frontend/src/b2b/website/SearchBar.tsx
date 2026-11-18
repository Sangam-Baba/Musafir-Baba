"use client";
// Hotel search bar: destination (autocomplete — cities, areas, hotels), check-in / check-out, rooms and guests.
// Choosing a hotel goes straight to its page; anything else opens /hotels with the search in the URL.
import { MapPin, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { addDays, guestsText, hotelsApi, roomsToParam, today, type Destination, type RoomAsk } from "./hotels";

const field = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#FE5300]";

function Guests({ rooms, onChange }: { rooms: RoomAsk[]; onChange: (r: RoomAsk[]) => void }) {
  const [open, setOpen] = useState(false);
  const set = (i: number, patch: Partial<RoomAsk>) => onChange(rooms.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`${field} flex items-center gap-2 text-left`}>
        <Users size={16} className="text-slate-400" /> {guestsText(rooms)}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          {rooms.map((r, i) => (
            <div key={i} className="space-y-1.5 border-b border-slate-100 pb-2 text-sm last:border-0">
              <div className="flex items-center justify-between font-medium text-slate-800">
                Room {i + 1}
                {rooms.length > 1 && <button type="button" className="text-xs text-red-600" onClick={() => onChange(rooms.filter((_, n) => n !== i))}>Remove</button>}
              </div>
              <label className="flex items-center justify-between text-slate-600">
                Adults
                <input type="number" min={1} max={8} value={r.adults} onChange={(e) => set(i, { adults: Math.min(Math.max(Number(e.target.value), 1), 8) })} className="h-8 w-16 rounded border border-slate-200 px-2" />
              </label>
              <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
                Children
                {r.childrenAges.map((age, k) => (
                  <select key={k} value={age} onChange={(e) => set(i, { childrenAges: r.childrenAges.map((a, m) => (m === k ? Number(e.target.value) : a)) })} className="h-8 rounded border border-slate-200 px-1 text-xs">
                    {Array.from({ length: 18 }, (_, a) => <option key={a} value={a}>{a} yr</option>)}
                  </select>
                ))}
                {r.childrenAges.length < 4 && <button type="button" className="text-xs text-[#FE5300]" onClick={() => set(i, { childrenAges: [...r.childrenAges, 5] })}>+ child</button>}
                {r.childrenAges.length > 0 && <button type="button" className="text-xs text-slate-500" onClick={() => set(i, { childrenAges: r.childrenAges.slice(0, -1) })}>− child</button>}
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            {rooms.length < 9 ? <button type="button" className="text-sm text-[#FE5300]" onClick={() => onChange([...rooms, { adults: 2, childrenAges: [] }])}>+ Add room</button> : <span />}
            <button type="button" className="text-sm font-medium text-slate-800" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HotelSearchBar({ initial }: { initial?: { destination?: Destination | null; checkIn?: string; checkOut?: string; rooms?: RoomAsk[] } }) {
  const router = useRouter();
  const [q, setQ] = useState(initial?.destination?.name ?? "");
  const [dest, setDest] = useState<Destination | null>(initial?.destination ?? null);
  const [list, setList] = useState<Destination[]>([]);
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? addDays(today(), 7));
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? addDays(today(), 8));
  const [rooms, setRooms] = useState<RoomAsk[]>(initial?.rooms ?? [{ adults: 2, childrenAges: [] }]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (dest && dest.name === q) return;
    clearTimeout(timer.current);
    if (q.trim().length < 2) return setList([]);
    timer.current = setTimeout(() => {
      hotelsApi<{ data: Destination[] }>(`/hotels/destinations?q=${encodeURIComponent(q.trim())}`).then((r) => setList(r.data), () => setList([]));
    }, 200);
    return () => clearTimeout(timer.current);
  }, [q, dest]);

  function go() {
    if (!dest) return;
    const stay = `checkIn=${checkIn}&checkOut=${checkOut}&rooms=${roomsToParam(rooms)}`;
    if (dest.type === "PROPERTY" && dest.slug) return router.push(`/hotels/${dest.slug}?${stay}`);
    const area = dest.type === "AREA" ? `&cityId=${dest.cityId}` : "";
    router.push(`/hotels?type=${dest.type}&id=${dest.id}${area}&name=${encodeURIComponent(dest.name)}&${stay}`);
  }

  return (
    <form onSubmit={(e) => (e.preventDefault(), go())} className="grid gap-2 rounded-xl bg-white p-3 shadow-md sm:grid-cols-[2fr_1fr_1fr_1.3fr_auto]">
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
        <input className={`${field} pl-9`} placeholder="City, area or hotel" value={q} onChange={(e) => (setQ(e.target.value), setDest(null))} aria-label="Destination" />
        {list.length > 0 && !dest && (
          <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
            {list.map((d) => (
              <li key={`${d.type}-${d.id}`}>
                <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-orange-50" onClick={() => (setDest(d), setQ(d.name), setList([]))}>
                  <span className="text-slate-800">{d.name}{d.type !== "CITY" && <span className="text-slate-500">, {d.cityName}</span>}</span>
                  <span className="text-[11px] uppercase text-slate-400">{d.type === "PROPERTY" ? "hotel" : d.type.toLowerCase()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input type="date" className={field} value={checkIn} min={today()} onChange={(e) => (setCheckIn(e.target.value), e.target.value >= checkOut && setCheckOut(addDays(e.target.value, 1)))} aria-label="Check-in" />
      <input type="date" className={field} value={checkOut} min={addDays(checkIn, 1)} max={addDays(checkIn, 30)} onChange={(e) => setCheckOut(e.target.value)} aria-label="Check-out" />
      <Guests rooms={rooms} onChange={setRooms} />
      <button type="submit" disabled={!dest} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FE5300] px-5 text-sm font-semibold text-white disabled:opacity-50">
        <Search size={16} /> Search
      </button>
    </form>
  );
}
