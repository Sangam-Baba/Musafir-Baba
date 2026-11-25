"use client";
// Pricing → GST & settings: the GST rates in force (dated, never edited — a change is a new rate a second person
// approves; the rate it follows ends the day before) and the pricing settings (MusafirBaba's GSTINs, whether hotels
// without GST can be sold). Changing either needs the GST permission (Super Admin).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GST_STATES } from "../../../kyc";
import { rupees } from "../../../inventory";
import { errorMessage } from "../../../messages";
import { pct, pricingProblems, type Issuer, type PricingSettings, type TaxRule } from "../../../pricing";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, FleetPill, fleetSelectClass, fleetTone, Input, inputSm, labelSm, Notice, PrimaryBtn, SecondaryBtn } from "../kit";

const TONE: Record<TaxRule["status"], string> = { ACTIVE: fleetTone.emerald, PENDING_APPROVAL: fleetTone.amber, REJECTED: fleetTone.slate, RETIRED: fleetTone.slate };
const slab = (r: TaxRule) => (r.slabMaxPaise === null ? `above ${rupees(r.slabMinPaise - 1)}` : r.slabMinPaise === 0 ? `up to ${rupees(r.slabMaxPaise)}` : `${rupees(r.slabMinPaise)} – ${rupees(r.slabMaxPaise)}`);

function ProposeRate({ token, active, onDone }: { token: string; active: TaxRule[]; onDone: () => void }) {
  const [f, setF] = useState({ appliesTo: "ACCOMMODATION", sac: "996311", min: "0", max: "7500", rate: "5", itc: false, from: "", to: "", note: "", replaces: "" });
  const [problems, setProblems] = useState<string[]>([]);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  async function send() {
    setProblems([]);
    try {
      const body = { appliesTo: f.appliesTo, sac: f.sac, slabMinPaise: Math.round(Number(f.min) * 100), slabMaxPaise: f.max.trim() === "" ? null : Math.round(Number(f.max) * 100), rateBps: Math.round(Number(f.rate) * 100), itcAllowed: f.itc, effectiveFrom: f.from, effectiveTo: f.to || null, sourceNote: f.note, replaces: f.replaces || null };
      await adminCall("/admin/tax-rules", token, { method: "POST", body });
      toast.success("Proposed — another person with the GST permission must approve it");
      onDone();
    } catch (e) {
      setProblems(pricingProblems(e));
      toast.error(errorMessage(e));
    }
  }
  const input = (label: string, key: keyof typeof f, type = "text") => (
    <label className="flex flex-col gap-1">
      <span className={labelSm}>{label}</span>
      <Input className={inputSm} type={type} value={String(f[key])} onChange={(e) => set({ [key]: e.target.value } as Partial<typeof f>)} />
    </label>
  );
  return (
    <div className="space-y-2 rounded-md border border-slate-100 p-3">
      <div className="grid gap-2 sm:grid-cols-6">
        <label className="flex flex-col gap-1">
          <span className={labelSm}>For</span>
          <select className={fleetSelectClass} value={f.appliesTo} onChange={(e) => set({ appliesTo: e.target.value })}>
            <option value="ACCOMMODATION">Rooms</option>
            <option value="SAAS">Plan fees</option>
            <option value="BUS_TRANSPORT">Bus tickets (rate and SAC from the CA)</option>
          </select>
        </label>
        {input("SAC", "sac")}
        {input("From ₹ (per night)", "min", "number")}
        {input("To ₹ (empty = no max)", "max", "number")}
        {input("Rate %", "rate", "number")}
        <label className="flex items-end gap-1.5 pb-1 text-[12px]"><input type="checkbox" checked={f.itc} onChange={(e) => set({ itc: e.target.checked })} /> Input tax credit</label>
        {input("Valid from (stay date)", "from", "date")}
        {input("Valid until (optional)", "to", "date")}
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelSm}>Follows (ends the day before)</span>
          <select className={fleetSelectClass} value={f.replaces} onChange={(e) => set({ replaces: e.target.value })}>
            <option value="">— nothing —</option>
            {active.map((r) => <option key={r.key} value={r.key}>{r.key}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">{input("Source (notification no., CA note)", "note")}</div>
      </div>
      {problems.length > 0 && <Notice tone="red"><ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>}
      <PrimaryBtn disabled={!f.from || f.note.trim().length < 5} onClick={send}>Propose rate</PrimaryBtn>
    </div>
  );
}

function Rates({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const rates = useQuery({ queryKey: ["b2b-admin", "pricing", "tax"], queryFn: () => adminCall<{ data: TaxRule[] }>("/admin/tax-rules", token) });
  const all = rates.data?.data ?? [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "pricing", "tax"] });
  async function decide(r: TaxRule, action: "approve" | "reject") {
    try {
      await adminCall(`/admin/tax-rules/${r.id}/${action}`, token, { method: "POST", body: {}, headers: { "If-Match": `"${r.version}"` } });
      toast.success(action === "approve" ? "Approved — in force from its date" : "Rejected");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <FleetPanel title="GST rates" description="Decided per room per night on the sell price. ₹7,500.00 exactly is in the lower slab." icon={Landmark} actions={<SecondaryBtn onClick={() => setAdding(!adding)}>{adding ? "Close" : "Propose a new rate"}</SecondaryBtn>}>
      <div className="space-y-2">
        {adding && <ProposeRate token={token} active={all.filter((r) => r.status === "ACTIVE")} onDone={() => (setAdding(false), refresh())} />}
        <table className="w-full text-[12px]">
          <thead className="text-left text-slate-500">
            <tr>{["", "For", "Per night", "Rate", "ITC", "Valid", "Source", ""].map((h, i) => <th key={i} className="py-1 pr-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {all.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="py-1 pr-2"><FleetPill className={TONE[r.status]}>{r.status === "PENDING_APPROVAL" ? "Waiting" : r.status.toLowerCase()}</FleetPill></td>
                <td className="py-1 pr-2">{r.appliesTo === "ACCOMMODATION" ? "Rooms" : r.appliesTo === "BUS_TRANSPORT" ? "Bus tickets" : "Plan fees"} · SAC {r.sac}</td>
                <td className="py-1 pr-2">{slab(r)}</td>
                <td className="py-1 pr-2 font-medium">{pct(r.rateBps)}</td>
                <td className="py-1 pr-2">{r.itcAllowed ? "yes" : "no"}</td>
                <td className="py-1 pr-2 whitespace-nowrap">{r.effectiveFrom} → {r.effectiveTo ?? "open"}</td>
                <td className="py-1 pr-2 text-slate-500">{r.sourceNote}</td>
                <td className="py-1 whitespace-nowrap">
                  {r.status === "PENDING_APPROVAL" && (
                    <span className="flex gap-1">
                      <PrimaryBtn onClick={() => decide(r, "approve")}>Approve</PrimaryBtn>
                      <SecondaryBtn onClick={() => decide(r, "reject")}>Reject</SecondaryBtn>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FleetPanel>
  );
}

function Settings({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["b2b-admin", "pricing", "settings"], queryFn: () => adminCall<PricingSettings>("/admin/pricing/settings", token) });
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [sellUnreg, setSellUnreg] = useState(true);
  const [note, setNote] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  useEffect(() => {
    if (q.data) {
      setIssuers(q.data.issuers);
      setSellUnreg(q.data.sellUnregisteredHotels);
    }
  }, [q.data]);
  if (!q.data) return null;
  const s = q.data;
  async function save() {
    setProblems([]);
    try {
      await adminCall("/admin/pricing/settings", token, { method: "PUT", body: { model: s.model, issuers, sellUnregisteredHotels: sellUnreg, note }, headers: { "If-Match": `"${s.version}"` } });
      toast.success("Settings saved — prices use them within a minute");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "pricing", "settings"] });
    } catch (e) {
      setProblems(pricingProblems(e));
      toast.error(errorMessage(e));
    }
  }
  const change = (i: number, p: Partial<Issuer>) => setIssuers(issuers.map((x, n) => (n === i ? { ...x, ...p } : p.isDefault ? { ...x, isDefault: false } : x)));
  return (
    <FleetPanel title="Pricing settings" description="Model: MusafirBaba resells rooms (GST on the sell price) — chosen by the owner, to be reviewed by the CA." icon={Landmark}>
      <div className="space-y-3 text-[12px]">
        <div className="space-y-1.5">
          <span className={labelSm}>MusafirBaba GST registrations (the invoice issuer; hotels in the same state get CGST + SGST, others IGST)</span>
          {issuers.map((iss, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select className={`${fleetSelectClass} w-56`} value={iss.stateCode} onChange={(e) => change(i, { stateCode: e.target.value })}>
                {GST_STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
              </select>
              <Input className={`${inputSm} w-56 font-mono`} value={iss.gstin ?? ""} placeholder="GSTIN (fill in)" onChange={(e) => change(i, { gstin: e.target.value.trim().toUpperCase() || null })} />
              <label className="flex items-center gap-1"><input type="radio" checked={iss.isDefault} onChange={() => change(i, { isDefault: true })} /> default</label>
              {issuers.length > 1 && <SecondaryBtn danger onClick={() => setIssuers(issuers.filter((_, n) => n !== i))}>Remove</SecondaryBtn>}
            </div>
          ))}
          <SecondaryBtn onClick={() => setIssuers([...issuers, { gstin: null, stateCode: "27", isDefault: false }])}>Add a registration</SecondaryBtn>
        </div>
        <label className="flex items-center gap-1.5 text-slate-700"><input type="checkbox" checked={sellUnreg} onChange={(e) => setSellUnreg(e.target.checked)} /> Sell hotels without a GST number (owner: yes for now — CA to review)</label>
        <div className="flex flex-wrap items-center gap-2">
          <Input className={`${inputSm} w-80`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (kept in the history)" />
          <PrimaryBtn disabled={note.trim().length < 5} onClick={save}>Save settings</PrimaryBtn>
        </div>
        {problems.length > 0 && <Notice tone="red"><ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>}
        {s.history.length > 0 && (
          <ol className="space-y-0.5 border-l border-slate-200 pl-3 text-[11px] text-slate-600">
            {[...s.history].reverse().slice(0, 10).map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} · {h.by} — {h.note}</li>)}
          </ol>
        )}
      </div>
    </FleetPanel>
  );
}

export function TaxSettings({ token }: { token: string }) {
  return (
    <div className="space-y-4">
      <Rates token={token} />
      <Settings token={token} />
    </div>
  );
}
