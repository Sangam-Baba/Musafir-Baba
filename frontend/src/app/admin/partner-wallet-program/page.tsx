"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletCards, Settings2, Ban } from "lucide-react";
import { FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTone, FleetEmptyState, fleetTh, fleetSelectClass } from "@/components/admin/fleet/FleetUI";

// MBConnect Partner Wallet program: uses each driver's one wallet (the same
// balance trip earnings are released into; recharges add to it). The per-km
// platform fee (instead of commission) and driver cancellation charges come
// from it. Balances/history are on the Partner Wallets page. Nothing changes
// until the program is switched ON.

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-wallet-program`;
const inr = (n?: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

interface Config {
  enabled: boolean;
  firstRechargeMin: number;
  minRecharge: number;
  maxRecharge: number;
  minBalance: number;
  feePerKm: number;
  cancellation: { freeMinutes: number; regularWithin24h: number; regularAfter24h: number; outstationFreeDays: number; outstationMidPerKm: number; outstationLatePerKm: number };
}
interface Cancellation {
  _id: string;
  rideCode?: string;
  partnerId?: { fullName?: string; mobileNumber?: string } | string;
  reasonLabel?: string;
  comment?: string;
  rule?: string;
  charge: number;
  chargedAmount: number;
  status: "FREE" | "CHARGED" | "REVIEW" | "WAIVED";
  decidedBy?: string;
  adminNote?: string;
  createdAt: string;
}

const STATUS_TONE: Record<Cancellation["status"], string> = { FREE: fleetTone.slate, CHARGED: fleetTone.red, REVIEW: fleetTone.amber, WAIVED: fleetTone.emerald };

function useApi() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  return async (path: string, method = "GET", body?: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "Request failed");
    return json;
  };
}

export default function PartnerWalletProgramPage() {
  const [tab, setTab] = useState<"settings" | "cancellations">("settings");
  return (
    <FleetPage>
      <FleetPageHeader
        icon={WalletCards}
        title="Wallet Program"
        description="Per-km platform fee instead of commission, and driver cancellation charges — taken from the driver's wallet. Balances and history: Partner Wallets."
      />
      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        {([["settings", "Settings"], ["cancellations", "Driver cancellations"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-[13px] font-medium ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "settings" && <SettingsTab />}
      {tab === "cancellations" && <CancellationsTab />}
    </FleetPage>
  );
}

// ---------------- Settings ----------------
function NumberField({ label, hint, value, onChange, step = 1 }: { label: string; hint?: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="text-[12px] font-medium text-slate-700">
      {label}
      <Input type="number" min={0} step={step} className="mt-1" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="mt-1 block text-[11px] font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

function SettingsTab() {
  const call = useApi();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Config>({ queryKey: ["wallet-program-config"], queryFn: async () => (await call("/config")).data });
  const [draft, setDraft] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const cfg = draft || data;

  if (isLoading || !cfg) return <FleetPanel title="Settings" icon={Settings2}><Loader /></FleetPanel>;
  const set = (patch: Partial<Config>) => setDraft({ ...cfg, ...patch });
  const setC = (patch: Partial<Config["cancellation"]>) => setDraft({ ...cfg, cancellation: { ...cfg.cancellation, ...patch } });

  const save = async (override?: Partial<Config>) => {
    const body = { ...cfg, ...override };
    if (override?.enabled === true && !confirm("Switch the Wallet Program ON? From now on drivers need enough wallet balance to accept rides, and new rides carry no commission (the per-km fee is charged instead).")) return;
    if (override?.enabled === false && !confirm("Switch the Wallet Program OFF? New rides will use the normal commission and no wallet checks.")) return;
    setBusy(true);
    try {
      await call("/config", "PUT", body);
      toast.success(override?.enabled !== undefined ? (override.enabled ? "Wallet Program is ON" : "Wallet Program is OFF") : "Settings saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["wallet-program-config"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FleetPanel
        title="Program status"
        icon={Settings2}
        actions={
          cfg.enabled ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => save({ enabled: false })}>Switch OFF</Button>
          ) : (
            <Button size="sm" disabled={busy} className="bg-[#FE5300] hover:bg-[#e54b00]" onClick={() => save({ enabled: true })}>Switch ON</Button>
          )
        }
      >
        <div className="flex items-center gap-3 p-4 text-[13px]">
          <FleetPill className={cfg.enabled ? fleetTone.emerald : fleetTone.slate}>{cfg.enabled ? "ON" : "OFF"}</FleetPill>
          <span className="text-slate-600">
            {cfg.enabled
              ? "Drivers need the trip fee plus the minimum balance available in their wallet to accept. Rides accepted now carry no commission; the per-km fee is charged from the wallet."
              : "Off: accepting, earnings (with commission) and cancellations work exactly as before."}
          </span>
        </div>
      </FleetPanel>

      <FleetPanel title="Wallet & fee" description="Amounts in ₹.">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <NumberField label="First recharge (minimum)" hint="Minimum amount of a driver's first recharge" value={cfg.firstRechargeMin} onChange={(v) => set({ firstRechargeMin: v })} />
          <NumberField label="Minimum balance" hint="Must stay available after holding a trip fee" value={cfg.minBalance} onChange={(v) => set({ minBalance: v })} />
          <NumberField label="Platform fee per km" hint="× booked trip km (round trips both ways)" value={cfg.feePerKm} step={0.1} onChange={(v) => set({ feePerKm: v })} />
          <NumberField label="Later recharges (minimum)" value={cfg.minRecharge} onChange={(v) => set({ minRecharge: v })} />
          <NumberField label="Maximum per recharge" value={cfg.maxRecharge} onChange={(v) => set({ maxRecharge: v })} />
        </div>
      </FleetPanel>

      <FleetPanel title="Driver cancellation charges" description="City rides use the flat 'regular' charges; outstation rides use the per-km slabs by time before pickup. Never both.">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <NumberField label="Free cancellation window (minutes after accepting)" value={cfg.cancellation.freeMinutes} onChange={(v) => setC({ freeMinutes: v })} />
          <NumberField label="City ride: within 24h of accepting (₹ flat)" value={cfg.cancellation.regularWithin24h} onChange={(v) => setC({ regularWithin24h: v })} />
          <NumberField label="City ride: after 24h of accepting (₹ flat)" value={cfg.cancellation.regularAfter24h} onChange={(v) => setC({ regularAfter24h: v })} />
          <NumberField label="Outstation: free if more than (days) before pickup" value={cfg.cancellation.outstationFreeDays} onChange={(v) => setC({ outstationFreeDays: v })} />
          <NumberField label="Outstation: 24h to free-days before pickup (₹/km)" step={0.1} value={cfg.cancellation.outstationMidPerKm} onChange={(v) => setC({ outstationMidPerKm: v })} />
          <NumberField label="Outstation: within 24h of pickup (₹/km)" step={0.1} value={cfg.cancellation.outstationLatePerKm} onChange={(v) => setC({ outstationLatePerKm: v })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-3">
          {draft && <Button size="sm" variant="outline" onClick={() => setDraft(null)}>Discard</Button>}
          <Button size="sm" disabled={busy || !draft} className="bg-[#FE5300] hover:bg-[#e54b00]" onClick={() => save()}>Save settings</Button>
        </div>
      </FleetPanel>
    </>
  );
}

// ---------------- Driver cancellations ----------------
function CancellationsTab() {
  const call = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState("REVIEW");
  const { data, isLoading } = useQuery<{ data: Cancellation[] }>({ queryKey: ["driver-cancellations", status], queryFn: () => call(`/cancellations${status ? `?status=${status}` : ""}`) });
  const items = data?.data || [];

  const decide = async (c: Cancellation, action: "WAIVE" | "CHARGE" | "DISMISS") => {
    const note = prompt(
      action === "WAIVE" ? `Refund ₹${c.chargedAmount} to the driver? Add a note:` : action === "CHARGE" ? `Charge ₹${c.charge} from the driver's wallet? Add a note:` : "Clear this without a charge? Add a note:"
    );
    if (note === null) return;
    try {
      await call(`/cancellations/${c._id}`, "PATCH", { action, note });
      toast.success(action === "WAIVE" ? "Charge refunded" : action === "CHARGE" ? "Charge applied" : "Cleared without charge");
      qc.invalidateQueries({ queryKey: ["driver-cancellations"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <FleetPanel
      title="Driver cancellations"
      icon={Ban}
      description="Charged automatically by the rules. Exempt-type reasons (rider asked, emergency, wrong details, app issue) wait here for review and are never charged automatically."
      actions={
        <select className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="REVIEW">Needs review</option>
          <option value="CHARGED">Charged</option>
          <option value="WAIVED">Waived</option>
          <option value="FREE">No charge</option>
          <option value="">All</option>
        </select>
      }
    >
      {isLoading ? <Loader /> : items.length === 0 ? (
        <FleetEmptyState icon={Ban} title="Nothing here" />
      ) : (
        <Table className="text-[13px]">
          <TableHeader><TableRow>{["Trip", "Driver", "Reason", "Rule", "Charge", "Status", ""].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {items.map((c) => {
              const driver = typeof c.partnerId === "object" ? c.partnerId : null;
              return (
                <TableRow key={c._id}>
                  <TableCell><p className="font-mono text-[12px] font-semibold">{c.rideCode}</p><p className="text-[11px] text-slate-500">{fmt(c.createdAt)}</p></TableCell>
                  <TableCell><p className="font-medium">{driver?.fullName || "—"}</p><p className="text-[11px] text-slate-500">{driver?.mobileNumber}</p></TableCell>
                  <TableCell className="max-w-[220px]"><p>{c.reasonLabel}</p>{c.comment && <p className="truncate text-[11px] text-slate-500">{c.comment}</p>}</TableCell>
                  <TableCell className="max-w-[200px] text-[12px] text-slate-600">{c.rule}</TableCell>
                  <TableCell className="font-semibold">{inr(c.status === "CHARGED" ? c.chargedAmount : c.charge)}</TableCell>
                  <TableCell><FleetPill className={STATUS_TONE[c.status]}>{c.status === "REVIEW" ? "Needs review" : c.status}</FleetPill>{c.adminNote && <p className="mt-1 text-[11px] text-slate-500">{c.adminNote}</p>}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {c.status === "CHARGED" && <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => decide(c, "WAIVE")}>Waive & refund</Button>}
                      {c.status === "REVIEW" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => decide(c, "DISMISS")}>No charge</Button>
                          <Button size="sm" className="h-7 bg-[#FE5300] text-[12px] hover:bg-[#e54b00]" onClick={() => decide(c, "CHARGE")}>Charge {inr(c.charge)}</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </FleetPanel>
  );
}
