"use client";

// "City rides" admin section: same-city rate card, city groups and switch.
// Rides only use it while the master switch AND this switch are ON and the
// pickup/drop resolve to the same city group (backend cityFare.service.js).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Trash2 } from "lucide-react";

// Must match PARTNER_VEHICLE_CATEGORIES in backend/src/models/RidePricingConfig.js
const PARTNER_CATEGORIES = ["Hatchback", "Sedan", "SUV", "Tempo Traveller"] as const;

export interface CityVehicle {
  _id?: string;
  name: string;
  capacityLabel?: string;
  seatingCapacity: number;
  partnerCategory: string;
  basePrice: number;
  perKmRate: number;
  minBillableKm: number;
  freeWaitingMin: number;
  waitingChargePerMin: number;
  isActive: boolean;
  sortOrder: number;
}

export interface CityGroup {
  _id?: string;
  name: string;
  aliases: string[];
}

export interface CityPricing {
  enabled: boolean;
  vehicleTypes: CityVehicle[];
  cityGroups: CityGroup[];
}

export interface CityPreviewFare {
  name: string;
  isActive: boolean;
  actualKm: number;
  billableKm: number;
  basePrice: number;
  ratePerKm: number;
  vehicleFare: number;
  platformCharges: number;
  taxes: number;
  totalAmount: number;
  partnerPayout: number;
  freeWaitingMin: number;
  waitingChargePerMin: number;
}

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const cell = "h-8 w-20 px-2 text-sm";
const selectClass = "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";
const cardClass = "gap-0 overflow-hidden rounded-lg border-slate-200/80 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

export function getCityIssues(city?: CityPricing): string[] {
  if (!city) return [];
  const issues: string[] = [];
  const names = new Set<string>();
  city.vehicleTypes.forEach((v, i) => {
    const label = v.name?.trim() || `City row ${i + 1}`;
    if (!v.name?.trim()) issues.push(`${label}: name is required`);
    else if (names.has(v.name.trim().toLowerCase())) issues.push(`${label}: duplicate name`);
    names.add((v.name || "").trim().toLowerCase());
    if (v.isActive && !(v.perKmRate > 0)) issues.push(`${label}: ₹/km is required`);
  });
  if (city.enabled && !city.vehicleTypes.some((v) => v.isActive)) issues.push("Turn on at least one city vehicle");
  return issues;
}

export function CityRidesSection({
  value,
  masterOn,
  onChange,
}: {
  value: CityPricing;
  masterOn: boolean;
  onChange: (next: CityPricing) => void;
}) {
  const issues = getCityIssues(value);
  const setVehicle = (index: number, patch: Partial<CityVehicle>) =>
    onChange({ ...value, vehicleTypes: value.vehicleTypes.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const setGroup = (index: number, patch: Partial<CityGroup>) =>
    onChange({ ...value, cityGroups: value.cityGroups.map((g, i) => (i === index ? { ...g, ...patch } : g)) });

  const addVehicle = () =>
    onChange({
      ...value,
      vehicleTypes: [
        ...value.vehicleTypes,
        { name: "", capacityLabel: "", seatingCapacity: 4, partnerCategory: "Sedan", basePrice: 0, perKmRate: 0, minBillableKm: 20, freeWaitingMin: 15, waitingChargePerMin: 0, isActive: true, sortOrder: value.vehicleTypes.length + 1 },
      ],
    });
  const removeVehicle = (index: number) => {
    if (!window.confirm(`Remove "${value.vehicleTypes[index].name || "this vehicle"}" from city rides?`)) return;
    onChange({ ...value, vehicleTypes: value.vehicleTypes.filter((_, i) => i !== index) });
  };

  return (
    <Card className={cardClass}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 [.border-b]:pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
            <Building2 className="h-3.5 w-3.5 text-[#FE5300]" />
            City rides (pickup and drop in the same city)
          </CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">Used instead of the rate card above when both points are in the same city.</p>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px]" onClick={addVehicle}>
          <Plus className="h-4 w-4" /> Add vehicle
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4 text-[13px]">
        {/* Switch */}
        <div className={`flex items-center justify-between gap-4 rounded-md border px-3 py-2 ${value.enabled ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}>
          <p className="text-[13px] text-slate-700">
            <span className="font-semibold">Use city pricing.</span>{" "}
            {value.enabled
              ? masterOn
                ? "ON — same-city rides are priced from this section."
                : "ON, but the main switch above is OFF, so it has no effect yet."
              : "OFF — all rides use the rate card above."}
          </p>
          <Switch checked={value.enabled} onCheckedChange={(checked) => onChange({ ...value, enabled: checked })} />
        </div>

        {/* Formula */}
        <div className="space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">One way:</span> Base price + ₹/km × MAX(route km, min billable km), then platform charge + tax.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Round trip (same-day return):</span> Base price + ₹/km × MAX(route km × 2, min billable km). Different-day returns use the rate card above.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Extra time (round trips):</span> if the return starts after the booked return time + free waiting, each extra minute × waiting ₹/min, + tax. The rider pays it in the app after the trip; the partner gets it minus commission.
          </p>
        </div>

        {/* Rate card */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/60">
              <TableRow>
                {["On", "Name", "Seats", "Partner category", "Base price", "₹/km", "Min km", "Free waiting", "Waiting ₹/min", ""].map((h) => (
                  <TableHead key={h} className="h-9 whitespace-nowrap text-[11px] font-medium text-slate-500">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.vehicleTypes.map((v, i) => (
                <TableRow key={v._id || i} className={v.isActive ? "" : "opacity-50"}>
                  <TableCell className="py-1.5"><Switch checked={v.isActive} onCheckedChange={(c) => setVehicle(i, { isActive: c })} /></TableCell>
                  <TableCell className="py-1.5"><Input value={v.name} onChange={(e) => setVehicle(i, { name: e.target.value })} className="h-8 w-36 text-sm" /></TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-1">
                      <Input value={v.capacityLabel || ""} placeholder="4+1" onChange={(e) => setVehicle(i, { capacityLabel: e.target.value })} className="h-8 w-16 px-2 text-sm" />
                      <Input type="number" min={1} value={v.seatingCapacity} onChange={(e) => setVehicle(i, { seatingCapacity: toNumber(e.target.value) })} className="h-8 w-14 px-2 text-sm" />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <select className={selectClass} value={v.partnerCategory} onChange={(e) => setVehicle(i, { partnerCategory: e.target.value })}>
                      {PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="py-1.5"><Input type="number" min={0} value={v.basePrice} onChange={(e) => setVehicle(i, { basePrice: toNumber(e.target.value) })} className={cell} /></TableCell>
                  <TableCell className="py-1.5"><Input type="number" min={0} step={0.5} value={v.perKmRate} onChange={(e) => setVehicle(i, { perKmRate: toNumber(e.target.value) })} className={`${cell} ${v.isActive && !(v.perKmRate > 0) ? "border-red-400" : ""}`} /></TableCell>
                  <TableCell className="py-1.5"><Input type="number" min={0} value={v.minBillableKm} onChange={(e) => setVehicle(i, { minBillableKm: toNumber(e.target.value) })} className={cell} /></TableCell>
                  <TableCell className="py-1.5"><div className="flex items-center gap-1"><Input type="number" min={0} value={v.freeWaitingMin} onChange={(e) => setVehicle(i, { freeWaitingMin: toNumber(e.target.value) })} className={cell} /><span className="text-xs text-slate-400">min</span></div></TableCell>
                  <TableCell className="py-1.5"><Input type="number" min={0} step={0.5} value={v.waitingChargePerMin} onChange={(e) => setVehicle(i, { waitingChargePerMin: toNumber(e.target.value) })} className={cell} /></TableCell>
                  <TableCell className="py-1.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => removeVehicle(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* City groups */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-800">City groups</p>
              <p className="text-xs text-slate-500">Place names from the map that count as one city (comma separated). Places not listed only match their exact name.</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px]" onClick={() => onChange({ ...value, cityGroups: [...value.cityGroups, { name: "", aliases: [] }] })}>
              <Plus className="h-4 w-4" /> Add city
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {value.cityGroups.map((g, i) => (
              <div key={g._id || i} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
                <Input value={g.name} placeholder="City" onChange={(e) => setGroup(i, { name: e.target.value })} className="h-8 w-32 text-sm" />
                <Input
                  value={g.aliases.join(", ")}
                  placeholder="Delhi, New Delhi"
                  onChange={(e) => setGroup(i, { aliases: e.target.value.split(",").map((a) => a.trimStart()) })}
                  className="h-8 flex-1 text-sm"
                />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => onChange({ ...value, cityGroups: value.cityGroups.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {issues.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            <span className="font-semibold">Needs attention:</span> {issues.join(" · ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// City-ride results for the sample trip calculator.
export function CityPreviewTable({ fares, roundTrip }: { fares: CityPreviewFare[]; roundTrip: boolean }) {
  if (!fares.length) {
    return <p className="mt-3 text-xs text-slate-500">City rides: not applicable — a round trip must return the same day to use city pricing.</p>;
  }
  return (
    <div className="mt-4">
      <p className="mb-1 text-[12px] font-semibold text-slate-700">If pickup and drop are in the same city (City rides)</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/60">
            <TableRow>
              {["City vehicle", "Billable km", "Vehicle fare", "Platform + tax", "Rider pays", "Partner gets", roundTrip ? "Extra time rule" : ""].filter(Boolean).map((h) => (
                <TableHead key={h} className="h-9 text-[11px] font-medium text-slate-500">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fares.map((f) => (
              <TableRow key={f.name} className={f.isActive ? "" : "opacity-40"}>
                <TableCell className="py-1.5 font-medium">{f.name}</TableCell>
                <TableCell className="py-1.5">
                  {f.billableKm}
                  {f.billableKm !== f.actualKm && <span className="ml-1 text-xs text-amber-700">(min applied)</span>}
                </TableCell>
                <TableCell className="py-1.5">
                  {rupees(f.vehicleFare)} <span className="text-xs text-slate-400">= {rupees(f.basePrice)} + ₹{f.ratePerKm}/km</span>
                </TableCell>
                <TableCell className="py-1.5">{rupees(f.platformCharges + f.taxes)}</TableCell>
                <TableCell className="py-1.5 font-semibold">{rupees(f.totalAmount)}</TableCell>
                <TableCell className="py-1.5">{rupees(f.partnerPayout)}</TableCell>
                {roundTrip && <TableCell className="py-1.5 text-xs text-slate-600">{f.freeWaitingMin} min free, then ₹{f.waitingChargePerMin}/min</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
