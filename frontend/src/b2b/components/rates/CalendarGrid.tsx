"use client";
// The calendar grid: per room type its rooms per night (free in brackets) and per plan the price for the chosen number
// of guests, with the night's rules as small marks. Past nights are greyed. Clicking a cell picks it for the editor.
import { addDays, rupees, type Calendar, type CalendarPlan } from "../../inventory";

export type Target = { kind: "rooms"; roomTypeId: string } | { kind: "rate"; roomTypeId: string; ratePlanId: string };
const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** The price shown in a cell: for `guests` (capped at what the room takes), or the per-room price. */
function priceOf(plan: CalendarPlan, day: CalendarPlan["days"][number], guests: number, maxOccupancy: number) {
  const key = plan.pricingModel === "PER_ROOM" ? 0 : Math.min(guests, maxOccupancy);
  return day.prices.find((p) => p.guests === key)?.amount ?? null;
}

function Marks({ day }: { day: CalendarPlan["days"][number] }) {
  const marks = [day.minLos ? `min ${day.minLos}` : "", day.maxLos ? `max ${day.maxLos}` : "", day.closedToArrival ? "no arr." : "", day.closedToDeparture ? "no dep." : ""].filter(Boolean);
  return marks.length ? <span className="block text-[10px] leading-tight text-violet-600">{marks.join(" · ")}</span> : null;
}

export function CalendarGrid({ cal, guests, onPick }: { cal: Calendar; guests: number; onPick: (t: Target, date: string) => void }) {
  const cell = "border-l border-slate-100 px-1.5 py-1 text-center align-top";
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-max min-w-full border-collapse text-[12px]">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr>
            <th className="sticky left-0 z-20 min-w-48 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">Room type / plan</th>
            {cal.dates.map((d) => {
              const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
              return (
                <th key={d} className={`min-w-16 border-l border-slate-100 px-1.5 py-1.5 text-center font-normal ${wd === 0 || wd === 6 ? "bg-orange-50/60" : ""} ${d === cal.today ? "text-[#FE5300]" : "text-slate-500"}`}>
                  <span className="block text-[10px]">{WEEKDAY[wd]}</span>
                  <span className="font-medium text-slate-800">{d.slice(8)}</span>
                  {d.slice(8) === "01" || d === cal.dates[0] ? <span className="block text-[10px] text-slate-400">{new Date(`${d}T00:00:00Z`).toLocaleString("en-IN", { month: "short", timeZone: "UTC" })}</span> : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {cal.roomTypes.map((rt) => (
            <RoomRows key={rt.id} rt={rt} guests={guests} cell={cell} onPick={onPick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoomRows({ rt, guests, cell, onPick }: { rt: Calendar["roomTypes"][number]; guests: number; cell: string; onPick: (t: Target, date: string) => void }) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50/40">
        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-semibold text-slate-900">
          {rt.name} <span className="font-normal text-slate-400">rooms (free)</span>
        </td>
        {rt.nights.map((n) => (
          <td key={n.date} className={`${cell} ${n.editable ? "cursor-pointer hover:bg-orange-50" : "bg-slate-50 text-slate-400"} ${n.stopSell ? "bg-red-50 text-red-700" : ""}`} onClick={() => n.editable && onPick({ kind: "rooms", roomTypeId: rt.id }, n.date)}>
            <span className="font-medium">{n.total}</span> <span className="text-slate-400">({n.available})</span>
          </td>
        ))}
      </tr>
      {rt.ratePlans.map((p) => (
        <tr key={p.id} className="border-t border-slate-100">
          <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-slate-700">
            <span className="pl-3">{p.name}</span>
            {p.derived && <span className="ml-1 text-[10px] text-slate-400">follows</span>}
            {p.status === "INACTIVE" && <span className="ml-1 text-[10px] text-amber-600">paused</span>}
          </td>
          {p.days.map((d) => {
            const price = priceOf(p, d, guests, rt.maxOccupancy);
            return (
              <td key={d.date} className={`${cell} ${d.editable ? "cursor-pointer hover:bg-orange-50" : "bg-slate-50 text-slate-400"} ${d.stopSell ? "bg-red-50 text-red-700" : ""}`} onClick={() => d.editable && onPick({ kind: "rate", roomTypeId: rt.id, ratePlanId: p.id }, d.date)}>
                {price !== null ? rupees(price) : <span className="text-slate-300">—</span>}
                <Marks day={d} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/** The first night of a picked range and the night after it. */
export const pickRange = (date: string) => ({ from: date, to: addDays(date, 1) });
