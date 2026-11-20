"use client";
// Pricing → Simulator: the full price build-up for a typed hotel rate (any state / channel) or for a real property's
// calendar on chosen dates — hotel rate, margin and the rule that gave it, sell, GST lines, hotel's GST, totals.
// Draft rules can be included as if approved. Nothing is saved.
import { useQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GST_STATES } from "../../../kyc";
import { rupees } from "../../../inventory";
import { errorMessage } from "../../../messages";
import { CHANNEL_LABEL, CHANNELS, pct, type Breakdown, type Channel, type MarginRule, type SimResult } from "../../../pricing";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, fleetSelectClass, Input, inputSm, labelSm, Notice, PrimaryBtn } from "../kit";

type Offer = { roomTypeName: string | null; ratePlanId: string; mealPlanKey: string; available: number } & SimResult;
type Response = { mode: "sample"; results: SimResult[]; ruleNames: Record<string, string> } | { mode: "property"; offers: Offer[]; ruleNames: Record<string, string>; property: { name: string; stateCode: string; gstRegistered: boolean } };
const today = () => new Date().toISOString().slice(0, 10);
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function BreakdownView({ b, names }: { b: Breakdown; names: Record<string, string> }) {
  const t = b.totals;
  const rows: [string, number][] = [
    ["Hotel rate (net)", t.netPaise],
    ["MusafirBaba margin", t.marginPaise],
    ["Sell price (before GST)", t.sellPaise],
    ...(t.cgstPaise ? ([["CGST", t.cgstPaise], ["SGST", t.sgstPaise]] as [string, number][]) : []),
    ...(t.igstPaise ? ([["IGST", t.igstPaise]] as [string, number][]) : []),
    ["Total the buyer pays", t.totalPaise],
    ["Hotel's GST on its rate (cost)", t.hotelGstPaise],
    ["Payable to the hotel", t.hotelPayablePaise],
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-[18rem_1fr]">
      <table className="text-[12px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className={k.startsWith("Total") ? "font-semibold text-slate-900" : "text-slate-700"}>
              <td className="py-0.5 pr-3">{k}</td>
              <td className="py-0.5 text-right tabular-nums">{rupees(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="max-h-56 overflow-auto rounded border border-slate-100">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 text-slate-500">
            <tr>{["Night", "Room", "Net", "Margin", "Rule", "Sell", "GST", "Rate"].map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {b.lines.map((l) => (
              <tr key={`${l.date}-${l.room}`} className="border-t border-slate-100">
                <td className="px-2 py-0.5">{l.date}</td>
                <td className="px-2 py-0.5">{l.room + 1}</td>
                <td className="px-2 py-0.5 tabular-nums">{rupees(l.netPaise)}</td>
                <td className="px-2 py-0.5 tabular-nums">{rupees(l.marginPaise)}</td>
                <td className="px-2 py-0.5">{names[l.ruleId] ?? l.ruleId}</td>
                <td className="px-2 py-0.5 tabular-nums">{rupees(l.sellPaise)}</td>
                <td className="px-2 py-0.5 tabular-nums">{rupees(l.gst.gstPaise)} {l.gst.intraState ? "C+S" : "I"}</td>
                <td className="px-2 py-0.5">{pct(l.gst.rateBps)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Result({ r, names }: { r: SimResult; names: Record<string, string> }) {
  return r.ok ? <BreakdownView b={r.breakdown} names={names} /> : <Notice tone="red">Not sellable: {r.problem.reason ?? r.problem.code}</Notice>;
}

export function Simulator({ token }: { token: string }) {
  const [mode, setMode] = useState<"sample" | "property">("sample");
  const [f, setF] = useState({ channel: "WEBSITE" as Channel, clientCategory: "", net: "700", date: today(), nights: "1", rooms: "1", stateCode: "07", gst: true, propertyId: "", checkIn: plus(today(), 7), checkOut: plus(today(), 8), adults: "2", children: "0", drafts: [] as string[] });
  const [out, setOut] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);
  const rules = useQuery({ queryKey: ["b2b-admin", "pricing", "rules"], queryFn: () => adminCall<{ data: MarginRule[] }>("/admin/margin-rules", token) });
  const drafts = (rules.data?.data ?? []).filter((r) => r.status === "DRAFT" || r.status === "PENDING_APPROVAL");
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  async function run() {
    const body = {
      channel: f.channel,
      clientCategory: f.clientCategory.trim() || null,
      draftRuleIds: f.drafts,
      ...(mode === "sample"
        ? { sample: { netPaise: Math.round(Number(f.net) * 100), date: f.date, nights: Number(f.nights), rooms: Number(f.rooms), stateCode: f.stateCode, gstRegistered: f.gst } }
        : { property: { propertyId: f.propertyId.trim(), checkIn: f.checkIn, checkOut: f.checkOut, rooms: [{ adults: Number(f.adults), children: Number(f.children) }] } }),
    };
    setBusy(true);
    try {
      setOut(await adminCall<Response>("/admin/pricing/simulate", token, { method: "POST", body }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1">
      <span className={labelSm}>{label}</span>
      {el}
    </label>
  );
  return (
    <FleetPanel title="Price simulator" description="See exactly how a price is built for any channel — try draft rules before they are approved." icon={Calculator}>
      <div className="space-y-3">
        <div className="flex gap-1.5 text-[12px]">
          {(["sample", "property"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full border px-3 py-0.5 ${mode === m ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>
              {m === "sample" ? "Typed hotel rate" : "A real property"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {field("Channel", <select className={fleetSelectClass} value={f.channel} onChange={(e) => set({ channel: e.target.value as Channel })}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select>)}
          {field("Client category (optional)", <Input className={inputSm} value={f.clientCategory} onChange={(e) => set({ clientCategory: e.target.value })} placeholder="e.g. GOLD" />)}
          {mode === "sample" ? (
            <>
              {field("Hotel rate per night (₹)", <Input className={inputSm} type="number" value={f.net} onChange={(e) => set({ net: e.target.value })} />)}
              {field("Hotel's state", <select className={fleetSelectClass} value={f.stateCode} onChange={(e) => set({ stateCode: e.target.value })}>{GST_STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select>)}
              {field("First night", <Input className={inputSm} type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />)}
              {field("Nights", <Input className={inputSm} type="number" min={1} max={30} value={f.nights} onChange={(e) => set({ nights: e.target.value })} />)}
              {field("Rooms", <Input className={inputSm} type="number" min={1} max={9} value={f.rooms} onChange={(e) => set({ rooms: e.target.value })} />)}
              <label className="flex items-end gap-1.5 pb-1 text-[12px] text-slate-700"><input type="checkbox" checked={f.gst} onChange={(e) => set({ gst: e.target.checked })} /> Hotel has GST</label>
            </>
          ) : (
            <>
              {field("Property id", <Input className={inputSm} value={f.propertyId} onChange={(e) => set({ propertyId: e.target.value })} placeholder="from the property page URL" />)}
              {field("Check-in", <Input className={inputSm} type="date" value={f.checkIn} onChange={(e) => set({ checkIn: e.target.value })} />)}
              {field("Check-out", <Input className={inputSm} type="date" value={f.checkOut} onChange={(e) => set({ checkOut: e.target.value })} />)}
              {field("Adults / children", <div className="flex gap-1"><Input className={inputSm} type="number" value={f.adults} onChange={(e) => set({ adults: e.target.value })} /><Input className={inputSm} type="number" value={f.children} onChange={(e) => set({ children: e.target.value })} /></div>)}
            </>
          )}
        </div>
        {drafts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-700">
            <span className={labelSm}>Try draft rules:</span>
            {drafts.map((d) => (
              <label key={d.id} className="flex items-center gap-1"><input type="checkbox" checked={f.drafts.includes(d.id)} onChange={(e) => set({ drafts: e.target.checked ? [...f.drafts, d.id] : f.drafts.filter((x) => x !== d.id) })} /> {d.name}</label>
            ))}
          </div>
        )}
        <PrimaryBtn disabled={busy} onClick={run}>{busy ? "Working…" : "Show price"}</PrimaryBtn>
        {out?.mode === "sample" && out.results[0] && <Result r={out.results[0]} names={out.ruleNames} />}
        {out?.mode === "property" && (
          <div className="space-y-3">
            <p className="text-[12px] text-slate-600">{out.property.name} · state {out.property.stateCode} · {out.property.gstRegistered ? "GST registered" : "no GST"}</p>
            {out.offers.length === 0 && <Notice>No sellable rooms on those dates (rooms, prices or rules in the hotel&apos;s calendar).</Notice>}
            {out.offers.map((o) => (
              <div key={`${o.roomTypeName}-${o.ratePlanId}`} className="space-y-1 rounded-md border border-slate-100 p-2">
                <p className="text-[12px] font-medium text-slate-800">{o.roomTypeName} · {o.mealPlanKey.toUpperCase()} · {o.available} free</p>
                <Result r={o} names={out.ruleNames} />
              </div>
            ))}
          </div>
        )}
      </div>
    </FleetPanel>
  );
}
