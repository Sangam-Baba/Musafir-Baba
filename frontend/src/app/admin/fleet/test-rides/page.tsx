"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FlaskConical, Radio, Search } from "lucide-react";
import { FleetEmptyState, FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";

// MBConnect Test Rides: broadcast sample ride alerts to drivers. They look like
// real alerts but always carry the TEST RIDE badge and can never be accepted.
// Stored separately -- they never appear in Ride Bookings, earnings or reports.

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-test-rides`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const TRIP: Record<string, string> = { ONE_WAY: "One way", ROUND_TRIP: "Round trip", OUTSTATION: "Outstation" };

interface Config {
  riderNames: string[];
  cityPlaces: { city: string; places: string[] }[];
  genericPlaces: string[];
  tripMix: { oneWay: number; roundTrip: number; outstation: number };
  distanceKm: { local: { min: number; max: number }; outstation: { min: number; max: number } };
  perKm: { min: number; max: number };
  visibleMinutes: number;
  notificationTitle: string;
  notificationMessage: string;
  acceptMessage: string;
}

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

export default function TestRidesPage() {
  const permissions = useAdminAuthStore((s) => s.permissions) as string[];
  const role = useAdminAuthStore((s) => s.role);
  const [tab, setTab] = useState<"broadcast" | "history" | "settings">("broadcast");
  if (!(role === "admin" || role === "superadmin" || permissions?.includes("partner-test-rides"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }
  return (
    <FleetPage>
      <FleetPageHeader
        icon={FlaskConical}
        title="Test Rides"
        description="Broadcast sample ride alerts to drivers. They look like real ride alerts but always show a 🧪 TEST RIDE badge and can't be accepted. They never appear in real bookings, earnings or reports."
      />
      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        {([["broadcast", "Broadcast"], ["history", "History"], ["settings", "Settings"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-[13px] font-medium ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "broadcast" && <BroadcastTab onSent={() => setTab("history")} />}
      {tab === "history" && <HistoryTab />}
      {tab === "settings" && <SettingsTab />}
    </FleetPage>
  );
}

// ---------------- Broadcast ----------------
function BroadcastTab({ onSent }: { onSent: () => void }) {
  const call = useApi();
  const qc = useQueryClient();
  const [target, setTarget] = useState<"CITIES" | "ONLINE" | "SELECTED">("CITIES");
  const [cities, setCities] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [ridesPerDriver, setRidesPerDriver] = useState(1);
  const [visibleMinutes, setVisibleMinutes] = useState<number | "">("");
  const [sendPush, setSendPush] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const { data: cityList } = useQuery({ queryKey: ["test-ride-cities"], queryFn: async () => (await call("/cities")).data as { city: string; drivers: number }[] });
  const { data: drivers } = useQuery({ queryKey: ["test-ride-drivers", q], queryFn: async () => (await call(`/drivers?q=${encodeURIComponent(q)}`)).data as any[], enabled: target === "SELECTED" });
  const { data: cfg } = useQuery({ queryKey: ["test-ride-config"], queryFn: async () => await call("/config") });

  const body = () => ({
    target,
    cities: target === "SELECTED" ? [] : cities,
    partnerAuthIds: Object.keys(picked),
    ridesPerDriver,
    visibleMinutes: visibleMinutes || undefined,
    sendPush,
  });
  const doPreview = async () => {
    setBusy(true);
    try {
      setPreview((await call("/preview", "POST", body())).data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!confirm("Send these TEST RIDES to drivers now?")) return;
    setBusy(true);
    try {
      const r = await call("/broadcast", "POST", body());
      toast.success(r.message);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["test-ride-broadcasts"] });
      onSent();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggleCity = (c: string) => setCities((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <>
      <FleetPanel title="1. Who receives them" description="Approved drivers only. Each driver gets their own ride(s), built from their vehicle's work-location city.">
        <div className="space-y-3 p-4 text-[13px]">
          <div className="flex flex-wrap gap-2">
            {([["CITIES", "Drivers in cities"], ["ONLINE", "Drivers online now"], ["SELECTED", "Pick drivers"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setTarget(k); setPreview(null); }} className={`rounded-md border px-3 py-1.5 ${target === k ? "border-[#FE5300] bg-orange-50 font-semibold text-[#FE5300]" : "border-slate-200"}`}>
                {l}
              </button>
            ))}
          </div>
          {target !== "SELECTED" && (
            <div>
              <p className="mb-1 text-[12px] text-slate-500">{target === "ONLINE" ? "Optional: only these cities" : "Cities"}</p>
              <div className="flex flex-wrap gap-2">
                {(cityList || []).length === 0 && <span className="text-slate-400">No approved drivers with a work location yet.</span>}
                {(cityList || []).map((c) => (
                  <button key={c.city} type="button" onClick={() => { toggleCity(c.city); setPreview(null); }} className={`rounded-full border px-3 py-1 text-[12px] ${cities.includes(c.city) ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200"}`}>
                    {c.city} · {c.drivers}
                  </button>
                ))}
              </div>
            </div>
          )}
          {target === "SELECTED" && (
            <div>
              <div className="relative mb-2 w-72">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search name or mobile" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 pl-8 text-[12px]" />
              </div>
              <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                {(drivers || []).map((d) => (
                  <button
                    key={d.authId}
                    type="button"
                    onClick={() => { setPicked((p) => { const n = { ...p }; if (n[d.authId]) delete n[d.authId]; else n[d.authId] = d.fullName; return n; }); setPreview(null); }}
                    className={`rounded-full border px-3 py-1 text-[12px] ${picked[d.authId] ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200"}`}
                  >
                    {d.fullName} {d.isOnline ? "🟢" : ""}
                  </button>
                ))}
              </div>
              {Object.keys(picked).length > 0 && <p className="mt-2 text-[12px] text-slate-600">Selected: {Object.values(picked).join(", ")}</p>}
            </div>
          )}
        </div>
      </FleetPanel>

      <FleetPanel title="2. Options">
        <div className="flex flex-wrap items-end gap-6 p-4 text-[13px]">
          <label>
            <span className="block text-[12px] text-slate-500">Rides per driver</span>
            <select value={ridesPerDriver} onChange={(e) => setRidesPerDriver(Number(e.target.value))} className="mt-1 h-9 rounded-md border border-slate-200 px-2">
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-[12px] text-slate-500">Visible for (minutes)</span>
            <Input type="number" min={1} placeholder={String(cfg?.data?.visibleMinutes ?? 30)} value={visibleMinutes} onChange={(e) => setVisibleMinutes(e.target.value ? Number(e.target.value) : "")} className="mt-1 h-9 w-28" />
          </label>
          <label className="flex items-center gap-2 pb-2">
            <Switch checked={sendPush} onCheckedChange={setSendPush} />
            <span>Send push notification</span>
          </label>
        </div>
      </FleetPanel>

      <FleetPanel title="3. Preview & send" description="Preview shows what a few drivers will get (each broadcast generates fresh rides).">
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={doPreview}>Preview</Button>
            <Button disabled={busy || !preview || preview.driverCount === 0} className="bg-[#FE5300] hover:bg-[#e54b00]" onClick={send}>
              <Radio size={14} className="mr-1" /> Broadcast{preview ? ` to ${preview.driverCount} drivers` : ""}
            </Button>
          </div>
          {preview && (
            <>
              <p className="text-[13px] text-slate-600">
                {preview.driverCount} drivers will receive {preview.driverCount * ridesPerDriver} test rides.
                {preview.skipped ? ` ${preview.skipped} approved drivers skipped (no active vehicle / work location).` : ""}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {preview.rides.map((r: any, i: number) => (
                  <div key={i} className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-[13px]">
                    <p className="text-[11px] text-slate-500">For {r.driver}</p>
                    <p className="font-semibold">{r.notificationTitle}</p>
                    <p className="text-slate-700">{r.notificationMessage}</p>
                    <p className="mt-1 text-[12px] text-slate-500">Rider {r.riderName} · {r.vehicleCategory} · {TRIP[r.tripType]} · {r.distanceKm} km · {r.rideDate} {r.rideTime}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </FleetPanel>
    </>
  );
}

// ---------------- History ----------------
function HistoryTab() {
  const call = useApi();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["test-ride-broadcasts"], queryFn: async () => (await call("/broadcasts")).data as any[], refetchInterval: 30000 });
  const end = async (id: string) => {
    if (!confirm("End this broadcast? Its test rides disappear from drivers' apps now.")) return;
    try {
      await call(`/broadcasts/${id}/end`, "POST");
      toast.success("Ended");
      qc.invalidateQueries({ queryKey: ["test-ride-broadcasts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (isLoading) return <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>;
  return (
    <FleetPanel title="Broadcast history">
      {!data?.length ? (
        <FleetEmptyState icon={FlaskConical} title="No test rides sent yet" />
      ) : (
        <Table className="text-[13px]">
          <TableHeader><TableRow>{["Sent", "By", "To", "Drivers", "Rides", "Seen", "Tapped Accept", "Status", ""].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {data.map((b) => (
              <TableRow key={b._id}>
                <TableCell className="whitespace-nowrap">{fmt(b.createdAt)}</TableCell>
                <TableCell>{b.createdBy}</TableCell>
                <TableCell className="max-w-[200px] text-[12px]">{b.target === "CITIES" ? b.cities.join(", ") : b.target === "ONLINE" ? `Online${b.cities?.length ? ` · ${b.cities.join(", ")}` : ""}` : `${b.partnerAuthIds?.length || 0} picked`}{!b.sendPush && <span className="text-slate-400"> · no push</span>}</TableCell>
                <TableCell className="tabular-nums">{b.driverCount}{b.skipped ? <span className="text-[11px] text-slate-400"> (+{b.skipped} skipped)</span> : null}</TableCell>
                <TableCell className="tabular-nums">{b.rideCount}</TableCell>
                <TableCell className="tabular-nums">{b.seen}</TableCell>
                <TableCell className="tabular-nums">{b.tapped}<span className="text-[11px] text-slate-400"> ({b.taps} taps)</span></TableCell>
                <TableCell>{b.active ? <FleetPill className={fleetTone.emerald}>Live until {fmt(b.expiresAt)}</FleetPill> : <FleetPill className={fleetTone.slate}>{b.endedAt ? `Ended by ${b.endedBy}` : "Expired"}</FleetPill>}</TableCell>
                <TableCell>{b.active && <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => end(b._id)}>End now</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </FleetPanel>
  );
}

// ---------------- Settings ----------------
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function SettingsTab() {
  const call = useApi();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["test-ride-config"], queryFn: async () => await call("/config") });
  const [draft, setDraft] = useState<Config | null>(null);
  const [placesText, setPlacesText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (isLoading || !data) return <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>;
  const cfg: Config = draft || data.data;
  const set = (p: Partial<Config>) => setDraft({ ...cfg, ...p });
  // City places edited as "City: place 1 | place 2 | ..." one city per line.
  const placesValue = placesText ?? cfg.cityPlaces.map((c) => `${c.city}: ${c.places.join(" | ")}`).join("\n");
  const save = async () => {
    setBusy(true);
    try {
      const cityPlaces = lines(placesValue).map((l) => {
        const i = l.indexOf(":");
        const city = i >= 0 ? l.slice(0, i) : l;
        const rest = i >= 0 ? l.slice(i + 1) : "";
        return { city: city.trim(), places: rest.split("|").map((x) => x.trim()).filter(Boolean) };
      });
      await call("/config", "PUT", { ...cfg, cityPlaces });
      toast.success("Saved");
      setDraft(null);
      setPlacesText(null);
      qc.invalidateQueries({ queryKey: ["test-ride-config"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const numField = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="block">
      <span className="text-[12px] text-slate-600">{label}</span>
      <Input type="number" min={0} value={String(value)} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 h-9" />
    </label>
  );
  return (
    <>
      <FleetPanel title="Messages" description={`The "${data.badge}" badge is always added to the alert and the card — it can't be removed.`}>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[12px] text-slate-600">Notification title (shown as "{data.badge} · …")</span>
            <Input value={cfg.notificationTitle} onChange={(e) => set({ notificationTitle: e.target.value })} className="mt-1 h-9" />
          </label>
          <label className="block">
            <span className="text-[12px] text-slate-600">Notification message — {"{pickup} {drop} {fare} {name} {city} {vehicle} {distance} {date} {time}"}</span>
            <Input value={cfg.notificationMessage} onChange={(e) => set({ notificationMessage: e.target.value })} className="mt-1 h-9" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[12px] text-slate-600">Message when a driver taps Accept (should say it's a test ride)</span>
            <Input value={cfg.acceptMessage} onChange={(e) => set({ acceptMessage: e.target.value })} className="mt-1 h-9" />
          </label>
        </div>
      </FleetPanel>
      <FleetPanel title="Trips, distance & fare">
        <div className="grid gap-4 p-4 md:grid-cols-4">
          {numField("One way %", cfg.tripMix.oneWay, (n) => set({ tripMix: { ...cfg.tripMix, oneWay: n } }))}
          {numField("Round trip %", cfg.tripMix.roundTrip, (n) => set({ tripMix: { ...cfg.tripMix, roundTrip: n } }))}
          {numField("Outstation %", cfg.tripMix.outstation, (n) => set({ tripMix: { ...cfg.tripMix, outstation: n } }))}
          {numField("Visible for (minutes)", cfg.visibleMinutes, (n) => set({ visibleMinutes: n }))}
          {numField("Local km — min", cfg.distanceKm.local.min, (n) => set({ distanceKm: { ...cfg.distanceKm, local: { ...cfg.distanceKm.local, min: n } } }))}
          {numField("Local km — max", cfg.distanceKm.local.max, (n) => set({ distanceKm: { ...cfg.distanceKm, local: { ...cfg.distanceKm.local, max: n } } }))}
          {numField("Outstation km — min", cfg.distanceKm.outstation.min, (n) => set({ distanceKm: { ...cfg.distanceKm, outstation: { ...cfg.distanceKm.outstation, min: n } } }))}
          {numField("Outstation km — max", cfg.distanceKm.outstation.max, (n) => set({ distanceKm: { ...cfg.distanceKm, outstation: { ...cfg.distanceKm.outstation, max: n } } }))}
          {numField("₹ per km — min", cfg.perKm.min, (n) => set({ perKm: { ...cfg.perKm, min: n } }))}
          {numField("₹ per km — max", cfg.perKm.max, (n) => set({ perKm: { ...cfg.perKm, max: n } }))}
        </div>
      </FleetPanel>
      <FleetPanel title="Places" description="Pickups come from the driver's work-location city. Outstation drops use another city.">
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[12px] text-slate-600">Places per city — one city per line: <code>Delhi: Saket | Connaught Place | IGI Airport T3</code></span>
            <Textarea value={placesValue} onChange={(e) => { setPlacesText(e.target.value); if (!draft) setDraft({ ...cfg }); }} className="mt-1 min-h-40 font-mono text-[12px]" />
          </label>
          <label className="block">
            <span className="text-[12px] text-slate-600">For cities without a list — one per line, <code>{"{city}"}</code> = driver's city</span>
            <Textarea value={cfg.genericPlaces.join("\n")} onChange={(e) => set({ genericPlaces: lines(e.target.value) })} className="mt-1 min-h-40 text-[12px]" />
          </label>
        </div>
      </FleetPanel>
      <FleetPanel title={`Rider names (${cfg.riderNames.length})`} description="One per line. Each test ride picks one at random.">
        <div className="p-4">
          <Textarea value={cfg.riderNames.join("\n")} onChange={(e) => set({ riderNames: lines(e.target.value) })} className="min-h-56 text-[12px]" />
        </div>
      </FleetPanel>
      <div className="flex gap-2">
        <Button disabled={busy || !draft} className="bg-[#FE5300] hover:bg-[#e54b00]" onClick={save}>Save settings</Button>
        {draft && <Button variant="outline" onClick={() => { setDraft(null); setPlacesText(null); }}>Discard</Button>}
      </div>
    </>
  );
}
