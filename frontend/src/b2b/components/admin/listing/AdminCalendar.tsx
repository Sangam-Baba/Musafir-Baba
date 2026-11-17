"use client";
// MusafirBaba staff: a property's rooms per night (read-only grid) and an override of rooms / stop-sell with a reason.
// Uses GET /admin/properties/:id/calendar and POST /admin/properties/:id/calendar/override (preview first).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { addDays, newRequestId, rupees, type Calendar, type EditResult } from "../../../inventory";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, Input, inputSm, labelSm, Notice, PrimaryBtn, SecondaryBtn } from "../kit";

const DAYS = 14;

function Grid({ cal }: { cal: Calendar }) {
  return (
    <div className="overflow-x-auto">
      {cal.roomTypes.map((rt) => (
        <table key={rt.id} className="mb-3 w-full min-w-[44rem] text-[12px]">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="w-40 py-1 pr-2 font-medium text-slate-800">{rt.name}</th>
              {rt.nights.map((n) => (
                <th key={n.date} className="px-1 py-1 text-center font-normal">{n.date.slice(5)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 pr-2 text-slate-600">Rooms (free)</td>
              {rt.nights.map((n) => (
                <td key={n.date} className={`px-1 py-1 text-center ${n.stopSell ? "bg-red-50 text-red-700" : ""}`}>
                  {n.total} <span className="text-slate-400">({n.available})</span>
                </td>
              ))}
            </tr>
            {rt.ratePlans.map((p) => (
              <tr key={p.id}>
                <td className="py-1 pr-2 text-slate-600">{p.name}</td>
                {p.days.map((d) => {
                  const two = d.prices.find((x) => x.guests === (p.pricingModel === "PER_ROOM" ? 0 : Math.min(2, rt.maxOccupancy)));
                  return (
                    <td key={d.date} className={`px-1 py-1 text-center ${d.stopSell ? "bg-red-50 text-red-700" : ""}`}>
                      {two ? rupees(two.amount) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function Override({ cal, propertyId, token, onDone }: { cal: Calendar; propertyId: string; token: string; onDone: () => void }) {
  const [form, setForm] = useState({ roomTypeId: cal.roomTypes[0]?.id ?? "", from: cal.today, to: addDays(cal.today, 1), total: "", stopSell: "", reason: "" });
  const [preview, setPreview] = useState<EditResult | null>(null);
  const [busy, setBusy] = useState(false);
  const room = { roomTypeId: form.roomTypeId, ...(form.total !== "" ? { total: Number(form.total) } : {}), ...(form.stopSell ? { stopSell: form.stopSell === "yes" } : {}) };

  async function send(dry: boolean) {
    setBusy(true);
    try {
      const r = await adminCall<EditResult>(`/admin/properties/${propertyId}/calendar/override`, token, {
        method: "POST",
        body: { requestId: newRequestId(), from: form.from, to: form.to, rooms: [room], preview: dry, reason: form.reason.trim() },
      });
      if (dry) setPreview(r);
      else {
        toast.success(r.refused.length ? `Changed — ${r.refused.length} night(s) kept their rooms (booked)` : "Calendar changed");
        setPreview(null);
        onDone();
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const ready = form.reason.trim().length >= 5 && (form.total !== "" || form.stopSell !== "");
  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <p className="text-[12px] font-semibold text-slate-800">Change on the hotel&apos;s behalf</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className={labelSm}>Room type<select className="mt-1 block h-8 w-full rounded-md border border-slate-200 px-2 text-[13px]" value={form.roomTypeId} onChange={set("roomTypeId")}>{cal.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className={labelSm}>From<Input type="date" className={inputSm} value={form.from} onChange={set("from")} /></label>
        <label className={labelSm}>Until (not included)<Input type="date" className={inputSm} value={form.to} onChange={set("to")} /></label>
        <label className={labelSm}>Rooms<Input type="number" min={0} className={inputSm} value={form.total} onChange={set("total")} placeholder="no change" /></label>
        <label className={labelSm}>Stop-sell<select className="mt-1 block h-8 w-full rounded-md border border-slate-200 px-2 text-[13px]" value={form.stopSell} onChange={set("stopSell")}><option value="">No change</option><option value="yes">Stop selling</option><option value="no">Sell again</option></select></label>
        <label className={labelSm}>Reason (the hotel sees it)<Input className={inputSm} value={form.reason} onChange={set("reason")} maxLength={500} /></label>
      </div>
      {preview && (
        <Notice tone={preview.refused.length ? "red" : "amber"}>
          {preview.nights} night(s) will change.{preview.refused.length ? ` ${preview.refused.length} night(s) keep their rooms because guests are booked: ${preview.refused.map((r) => r.date).join(", ")}.` : ""}
          {preview.skipped.past.length ? ` Past nights skipped: ${preview.skipped.past.length}.` : ""}
        </Notice>
      )}
      <div className="flex gap-2">
        <SecondaryBtn disabled={busy || !ready} onClick={() => send(true)}>Preview</SecondaryBtn>
        <PrimaryBtn disabled={busy || !ready || !preview} onClick={() => send(false)}>Apply</PrimaryBtn>
      </div>
    </div>
  );
}

/** The override form always shows; staff without `hotel-inventory.admin.override` get the server's refusal. */
export function AdminCalendar({ propertyId, token }: { propertyId: string; token: string }) {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const key = ["b2b-admin", "calendar", propertyId, from];
  const cal = useQuery({ queryKey: key, queryFn: () => adminCall<Calendar>(`/admin/properties/${propertyId}/calendar?from=${from}&to=${addDays(from, DAYS)}`, token) });
  return (
    <FleetPanel title="Rooms & prices" bodyClassName="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <SecondaryBtn onClick={() => setFrom(addDays(from, -DAYS))}>← Earlier</SecondaryBtn>
        <Input type="date" className={`${inputSm} w-40`} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <SecondaryBtn onClick={() => setFrom(addDays(from, DAYS))}>Later →</SecondaryBtn>
        <span className="text-[12px] text-slate-500">Rooms (free) · price for 2 guests · red = stop-sell</span>
      </div>
      {cal.isLoading && <p className="text-[12px] text-slate-500">Loading…</p>}
      {cal.error && <Notice tone="red">{errorMessage(cal.error)}</Notice>}
      {cal.data && cal.data.roomTypes.length === 0 && <p className="text-[12px] text-slate-500">No room types yet.</p>}
      {cal.data && cal.data.roomTypes.length > 0 && <Grid cal={cal.data} />}
      {cal.data && cal.data.roomTypes.length > 0 && (
        <Override cal={cal.data} propertyId={propertyId} token={token} onDone={() => queryClient.invalidateQueries({ queryKey: ["b2b-admin", "calendar", propertyId] })} />
      )}
    </FleetPanel>
  );
}
