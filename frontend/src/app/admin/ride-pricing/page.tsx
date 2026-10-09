"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calculator, Plus, Tags, Trash2 } from "lucide-react";
import { FleetPage, FleetPageHeader, FleetPill, fleetTone } from "@/components/admin/fleet/FleetUI";

// Must match PARTNER_VEHICLE_CATEGORIES in backend/src/models/RidePricingConfig.js
// -- ride dispatch matches partners on these exact names.
const PARTNER_CATEGORIES = ["Hatchback", "Sedan", "SUV", "Tempo Traveller"] as const;

interface RateCardVehicle {
  _id?: string;
  name: string;
  capacityLabel?: string;
  seatingCapacity: number;
  partnerCategory: string;
  oneWayRate: number;
  roundTripRate: number;
  minKmPerDay: number;
  extraKmRate: number;
  isActive: boolean;
  sortOrder: number;
}

interface RidePricingConfig {
  enabled: boolean;
  vehicleTypes: RateCardVehicle[];
  driverAllowancePerDay: number;
  nightAllowance: {
    amount: number;
    startHour: number;
    endHour: number;
    chargeOneWayIfPickupInWindow: boolean;
    chargeRoundTripPerNight: boolean;
  };
  platformCharge: { type: "FLAT" | "PERCENT"; value: number };
  taxPercent: number;
  commissionPercent: number;
  payableOnTripNote: string;
}

interface ConfigApiResponse {
  success: boolean;
  isSaved: boolean;
  data: RidePricingConfig;
}

interface PreviewFare {
  name: string;
  isActive: boolean;
  days: number;
  actualKm: number;
  billableKm: number;
  ratePerKm: number;
  vehicleFare: number;
  driverAllowance: number;
  nightAllowance: number;
  platformCharges: number;
  taxes: number;
  totalAmount: number;
  commission: number;
  partnerPayout: number;
}

interface PreviewTrip {
  tripType: "ONE_WAY" | "ROUND_TRIP";
  routeKm: number;
  rideDate: string;
  rideTime: string;
  returnDate: string;
}

const API_BASE = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/ride-pricing`;

const getConfig = async (accessToken: string): Promise<ConfigApiResponse> => {
  const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("Failed to load ride pricing");
  return res.json();
};

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const formatHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";
const cellInputClass = "h-8 w-20 px-2 text-sm";
const errorRing = "border-red-400 focus-visible:ring-red-400";

// Number input with a unit shown inside the box (₹ before, %/km after).
function UnitInput({
  value,
  onChange,
  prefix,
  suffix,
  invalid,
  step = 1,
  className = "w-28",
}: {
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  invalid?: boolean;
  step?: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {prefix && <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">{prefix}</span>}
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(toNumber(e.target.value))}
        className={`h-8 text-sm ${prefix ? "pl-6" : "pl-2"} ${suffix ? "pr-9" : "pr-2"} ${invalid ? errorRing : ""}`}
      />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}

// One line in the "Charges" list: what it is, the input, and whether it's
// currently being charged.
function ChargeRow({ label, help, children, isOff }: { label: string; help: string; children: React.ReactNode; isOff?: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 md:flex-row md:items-center md:justify-between dark:border-slate-800">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
          {label}
          {isOff && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">not charged</span>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{help}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// Formula term with its current value; greyed when it adds nothing.
function Term({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-md px-2 py-1 ${muted ? "bg-slate-50 text-slate-400 dark:bg-slate-900" : "bg-orange-50 text-slate-900 dark:bg-orange-950 dark:text-white"}`}>
      <span className="text-xs">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </span>
  );
}

function getRateCardIssues(vehicles: RateCardVehicle[]) {
  const issues: string[] = [];
  const seen = new Set<string>();
  vehicles.forEach((v, i) => {
    const label = v.name.trim() || `Row ${i + 1}`;
    if (!v.name.trim()) issues.push(`Row ${i + 1}: vehicle name is empty`);
    const key = v.name.trim().toLowerCase();
    if (key && seen.has(key)) issues.push(`${label}: name is used twice`);
    seen.add(key);
    if (!v.isActive) return;
    if (v.oneWayRate <= 0) issues.push(`${label}: one-way rate is ₹0`);
    if (v.roundTripRate <= 0) issues.push(`${label}: round-trip rate is ₹0`);
    if (v.minKmPerDay <= 0) issues.push(`${label}: min km/day is 0`);
  });
  if (!vehicles.some((v) => v.isActive)) issues.push("No active vehicle type — riders would see no cabs");
  return issues;
}

export default function RidePricingPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<ConfigApiResponse>({
    queryKey: ["adminRidePricing"],
    queryFn: () => getConfig(accessToken),
    enabled: !!accessToken,
  });

  const [draft, setDraft] = useState<RidePricingConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [trip, setTrip] = useState<PreviewTrip>({
    tripType: "ROUND_TRIP",
    routeKm: 280,
    rideDate: todayPlus(1),
    rideTime: "08:00",
    returnDate: todayPlus(3),
  });
  const [preview, setPreview] = useState<PreviewFare[] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Seed the editable draft from the server, but never clobber unsaved edits.
  useEffect(() => {
    if (data?.data && !isDirty) setDraft(data.data);
  }, [data, isDirty]);

  const issues = useMemo(() => (draft ? getRateCardIssues(draft.vehicleTypes) : []), [draft]);

  const update = (patch: Partial<RidePricingConfig>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setIsDirty(true);
  };

  const updateVehicle = (index: number, patch: Partial<RateCardVehicle>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, vehicleTypes: prev.vehicleTypes.map((v, i) => (i === index ? { ...v, ...patch } : v)) };
    });
    setIsDirty(true);
  };

  const addVehicle = () => {
    if (!draft) return;
    update({
      vehicleTypes: [
        ...draft.vehicleTypes,
        {
          name: "",
          capacityLabel: "",
          seatingCapacity: 4,
          partnerCategory: "Sedan",
          oneWayRate: 0,
          roundTripRate: 0,
          minKmPerDay: 250,
          extraKmRate: 0,
          isActive: true,
          sortOrder: draft.vehicleTypes.length + 1,
        },
      ],
    });
  };

  const removeVehicle = (index: number) => {
    if (!draft) return;
    const vehicle = draft.vehicleTypes[index];
    if (!window.confirm(`Remove "${vehicle.name || "this vehicle type"}" from the rate card?`)) return;
    update({ vehicleTypes: draft.vehicleTypes.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!draft) return;
    const turningOn = draft.enabled && !data?.data.enabled;
    const turningOff = !draft.enabled && data?.data.enabled;
    if (turningOn && issues.length > 0) {
      toast.error("Fix the highlighted rate card problems before turning pricing ON");
      return;
    }
    if (
      turningOn &&
      !window.confirm("Turn ON admin pricing? Every new ride quote and booking (app and website) will be priced from this rate card.")
    ) {
      return;
    }
    if (turningOff && !window.confirm("Turn OFF admin pricing? New rides go back to the previous partner-rate pricing.")) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(draft),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Ride pricing saved");
        setIsDirty(false);
        setDraft(result.data);
        queryClient.invalidateQueries({ queryKey: ["adminRidePricing"] });
      } else {
        toast.error(result.message || "Could not save ride pricing");
      }
    } catch {
      toast.error("Could not save ride pricing, please try again");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!window.confirm("Discard all unsaved changes?")) return;
    setIsDirty(false);
    setDraft(data?.data ?? null);
  };

  const handlePreview = async () => {
    if (!draft) return;
    setIsPreviewing(true);
    try {
      const res = await fetch(`${API_BASE}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ trip, config: draft }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setPreview(result.data);
      } else {
        setPreview(null);
        toast.error(result.message || "Could not calculate preview");
      }
    } catch {
      toast.error("Could not calculate preview, please try again");
    } finally {
      setIsPreviewing(false);
    }
  };

  if (isLoading || (!draft && !isError)) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" message="Loading ride pricing..." />
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
      </div>
    );
  }

  const night = draft.nightAllowance;
  const nightOff = night.amount <= 0 || (!night.chargeOneWayIfPickupInWindow && !night.chargeRoundTripPerNight);
  const platformValue = draft.platformCharge.type === "PERCENT" ? `${draft.platformCharge.value}%` : rupees(draft.platformCharge.value);

  return (
    <FleetPage className="gap-4">
      {/* Header */}
      <FleetPageHeader
        icon={Tags}
        title="Ride Pricing"
        description="Rate card, allowances and charges used to price MBGO rides."
        badges={
          <>
            <FleetPill className={draft.enabled ? fleetTone.emerald : fleetTone.slate}>{draft.enabled ? "Live" : "Off"}</FleetPill>
            {isDirty && <FleetPill className={fleetTone.amber}>Unsaved changes</FleetPill>}
          </>
        }
        actions={
          <>
            {isDirty && (
              <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={handleDiscard} disabled={isSaving}>
                Discard
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 bg-[#FE5300] text-[12px] hover:bg-[#e54b00]"
              onClick={handleSave}
              disabled={isSaving || (!isDirty && data?.isSaved)}
            >
              {isSaving ? "Saving..." : data?.isSaved ? "Save changes" : "Save rate card"}
            </Button>
          </>
        }
      />

      {/* Master switch */}
      <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${draft.enabled ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30" : "border-slate-200 bg-white dark:border-slate-800"}`}>
        <p className="text-[13px] text-slate-700 dark:text-slate-300">
          <span className="font-semibold">Use this rate card for new rides.</span>{" "}
          {draft.enabled
            ? "ON — new quotes and bookings are priced from this page."
            : "OFF — rides use the old partner-rate pricing. Nothing here affects riders yet."}
          {!data?.isSaved && <span className="text-amber-700"> Default values are not saved yet.</span>}
        </p>
        <Switch checked={draft.enabled} onCheckedChange={(checked) => update({ enabled: checked })} />
      </div>

      {/* How the fare is calculated, with the values currently filled in */}
      <Card className="gap-0 overflow-hidden rounded-lg border-slate-200/80 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="border-b border-slate-100 px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="text-[13px] font-semibold">How the fare is calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 text-[13px]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-full shrink-0 font-medium text-slate-600 sm:w-28">Vehicle fare</span>
              <span className="text-xs text-slate-500">One way:</span>
              <Term label="route km ×" value="One-way ₹/km" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hidden w-28 shrink-0 sm:inline-block" />
              <span className="text-xs text-slate-500">Round trip:</span>
              <Term label="MAX(route km × 2," value="Min km/day × days)" />
              <span>×</span>
              <Term label="" value="Round-trip ₹/km" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-full shrink-0 font-medium text-slate-600 sm:w-28">Rider pays</span>
              <Term label="Vehicle fare" value="" />
              <span>+</span>
              <Term label="Driver allowance" value={`${rupees(draft.driverAllowancePerDay)}/day`} muted={draft.driverAllowancePerDay <= 0} />
              <span>+</span>
              <Term label="Night allowance" value={`${rupees(night.amount)}/night`} muted={nightOff} />
              <span>+</span>
              <Term label="Platform" value={platformValue} muted={draft.platformCharge.value <= 0} />
              <span>+</span>
              <Term label="Tax" value={`${draft.taxPercent}%`} muted={draft.taxPercent <= 0} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-full shrink-0 font-medium text-slate-600 sm:w-28">Partner gets</span>
              <Term label="Vehicle fare −" value={`${draft.commissionPercent}% commission`} />
              <span>+</span>
              <Term label="Allowances" value="" />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            <span className="font-medium">Required:</span> one-way rate, round-trip rate and min km/day for every active vehicle.{" "}
            <span className="font-medium">Optional:</span> grey charges are 0 and not added. Tolls, parking, permits are never
            charged online.
          </p>
          {issues.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <span className="font-semibold">Needs attention:</span> {issues.join(" · ")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate card */}
      <Card className="gap-0 overflow-hidden rounded-lg border-slate-200/80 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="text-[13px] font-semibold">Rate card</CardTitle>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px]" onClick={addVehicle}>
            <Plus className="h-4 w-4" /> Add vehicle
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {/* Below xl: one editable card per vehicle (same handlers as the table) */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {draft.vehicleTypes.map((vehicle, index) => {
              const checkRequired = vehicle.isActive;
              return (
                <div
                  key={vehicle._id || `new-${index}`}
                  className={`space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 ${vehicle.isActive ? "" : "opacity-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                      Vehicle (shown to rider)
                      <Input
                        value={vehicle.name}
                        placeholder="e.g. Sedan"
                        onChange={(e) => updateVehicle(index, { name: e.target.value })}
                        className={`h-8 bg-white text-sm ${!vehicle.name.trim() ? errorRing : ""}`}
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${vehicle.name}`}
                      className="mt-5 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeVehicle(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-xs text-slate-500">
                      Seats
                      <Input
                        type="number"
                        min={1}
                        value={vehicle.seatingCapacity}
                        onChange={(e) => updateVehicle(index, { seatingCapacity: toNumber(e.target.value) })}
                        className="h-8 bg-white px-2 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-500" title="Partners with this vehicle category receive the ride">
                      Sent to partners with
                      <select
                        className={`${selectClass} bg-white`}
                        value={vehicle.partnerCategory}
                        onChange={(e) => updateVehicle(index, { partnerCategory: e.target.value })}
                      >
                        {PARTNER_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    {([
                      ["oneWayRate", "One way ₹/km"],
                      ["roundTripRate", "Round trip ₹/km"],
                      ["minKmPerDay", "Min km/day"],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="flex flex-col gap-1 text-xs text-slate-500">
                        {label}
                        <Input
                          type="number"
                          min={0}
                          step={field === "minKmPerDay" ? 10 : 0.5}
                          value={vehicle[field]}
                          onChange={(e) => updateVehicle(index, { [field]: toNumber(e.target.value) })}
                          className={`h-8 bg-white px-2 text-sm ${checkRequired && vehicle[field] <= 0 ? errorRing : ""}`}
                        />
                      </label>
                    ))}
                    <label className="flex items-center gap-2 self-end pb-1.5 text-xs font-medium text-slate-600">
                      <Checkbox
                        checked={vehicle.isActive}
                        onCheckedChange={(checked) => updateVehicle(index, { isActive: checked === true })}
                      />
                      Active
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <Table>
              <TableHeader className="bg-slate-50/60">
                <TableRow>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500 min-w-[180px]">Vehicle (shown to rider)</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500">Seats</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500" title="Partners with this vehicle category receive the ride">Sent to partners with</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500">One way ₹/km</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500">Round trip ₹/km</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500">Min km/day</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500">Active</TableHead>
                  <TableHead className="h-9 text-[11px] font-medium text-slate-500" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.vehicleTypes.map((vehicle, index) => {
                  const checkRequired = vehicle.isActive;
                  return (
                    <TableRow key={vehicle._id || `new-${index}`} className={vehicle.isActive ? "" : "opacity-50"}>
                      <TableCell className="py-1.5">
                        <Input
                          value={vehicle.name}
                          placeholder="e.g. Sedan"
                          onChange={(e) => updateVehicle(index, { name: e.target.value })}
                          className={`h-8 text-sm ${!vehicle.name.trim() ? errorRing : ""}`}
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={vehicle.seatingCapacity}
                          onChange={(e) => updateVehicle(index, { seatingCapacity: toNumber(e.target.value) })}
                          className="h-8 w-16 px-2 text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <select
                          className={selectClass}
                          value={vehicle.partnerCategory}
                          onChange={(e) => updateVehicle(index, { partnerCategory: e.target.value })}
                        >
                          {PARTNER_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      {(["oneWayRate", "roundTripRate", "minKmPerDay"] as const).map((field) => (
                        <TableCell key={field} className="py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={field === "minKmPerDay" ? 10 : 0.5}
                            value={vehicle[field]}
                            onChange={(e) => updateVehicle(index, { [field]: toNumber(e.target.value) })}
                            className={`${cellInputClass} ${checkRequired && vehicle[field] <= 0 ? errorRing : ""}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="py-1.5">
                        <Checkbox
                          checked={vehicle.isActive}
                          onCheckedChange={(checked) => updateVehicle(index, { isActive: checked === true })}
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <button
                          type="button"
                          aria-label={`Remove ${vehicle.name}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeVehicle(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Charges */}
      <Card className="gap-0 overflow-hidden rounded-lg border-slate-200/80 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="border-b border-slate-100 px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="text-[13px] font-semibold">Charges</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-1">
          <ChargeRow
            label="Driver allowance"
            help="Per day. One way = 1 day, round trip = number of days."
            isOff={draft.driverAllowancePerDay <= 0}
          >
            <UnitInput prefix="₹" suffix="/day" value={draft.driverAllowancePerDay} onChange={(n) => update({ driverAllowancePerDay: n })} />
          </ChargeRow>

          <ChargeRow label="Night allowance" help="Per night, between the hours chosen." isOff={nightOff}>
            <UnitInput prefix="₹" suffix="/night" className="w-32" value={night.amount} onChange={(n) => update({ nightAllowance: { ...night, amount: n } })} />
            <select className={selectClass} value={night.startHour} onChange={(e) => update({ nightAllowance: { ...night, startHour: toNumber(e.target.value) } })}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">to</span>
            <select className={selectClass} value={night.endHour} onChange={(e) => update({ nightAllowance: { ...night, endHour: toNumber(e.target.value) } })}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
            <div className="flex w-full flex-col gap-1 md:w-auto">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Checkbox
                  checked={night.chargeOneWayIfPickupInWindow}
                  onCheckedChange={(c) => update({ nightAllowance: { ...night, chargeOneWayIfPickupInWindow: c === true } })}
                />
                One way: if pickup is at night
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Checkbox
                  checked={night.chargeRoundTripPerNight}
                  onCheckedChange={(c) => update({ nightAllowance: { ...night, chargeRoundTripPerNight: c === true } })}
                />
                Round trip: each night away
              </label>
            </div>
          </ChargeRow>

          <ChargeRow label="Platform charge" help="Flat amount per ride, or % of vehicle fare." isOff={draft.platformCharge.value <= 0}>
            <select
              className={selectClass}
              value={draft.platformCharge.type}
              onChange={(e) => update({ platformCharge: { ...draft.platformCharge, type: e.target.value as "FLAT" | "PERCENT" } })}
            >
              <option value="FLAT">₹ flat</option>
              <option value="PERCENT">% of fare</option>
            </select>
            <UnitInput
              prefix={draft.platformCharge.type === "FLAT" ? "₹" : undefined}
              suffix={draft.platformCharge.type === "PERCENT" ? "%" : undefined}
              step={0.5}
              value={draft.platformCharge.value}
              onChange={(n) => update({ platformCharge: { ...draft.platformCharge, value: n } })}
            />
          </ChargeRow>

          <ChargeRow label="Tax" help="On vehicle fare + allowances + platform charge." isOff={draft.taxPercent <= 0}>
            <UnitInput suffix="%" step={0.5} value={draft.taxPercent} onChange={(n) => update({ taxPercent: n })} />
          </ChargeRow>

          <ChargeRow label="Platform commission" help="Taken from the vehicle fare only; deducted from what the partner gets.">
            <UnitInput suffix="%" step={0.5} value={draft.commissionPercent} onChange={(n) => update({ commissionPercent: n })} />
          </ChargeRow>

          <ChargeRow label="Payable on trip note" help="Shown to riders. These are paid to the driver, never online.">
            <Input
              value={draft.payableOnTripNote}
              onChange={(e) => update({ payableOnTripNote: e.target.value })}
              className="h-8 w-full text-sm md:w-[420px]"
            />
          </ChargeRow>
        </CardContent>
      </Card>

      {/* Preview calculator */}
      <Card className="gap-0 overflow-hidden rounded-lg border-slate-200/80 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="gap-0.5 border-b border-slate-100 px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold"><Calculator className="h-3.5 w-3.5 text-[#FE5300]" />Try a sample trip</CardTitle>
          <p className="text-xs text-slate-500">Uses the values on this page, including unsaved changes. Nothing is saved or booked.</p>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Trip
              <select
                className={selectClass}
                value={trip.tripType}
                onChange={(e) => setTrip({ ...trip, tripType: e.target.value as PreviewTrip["tripType"] })}
              >
                <option value="ONE_WAY">One way</option>
                <option value="ROUND_TRIP">Round trip</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Route distance
              <UnitInput suffix="km" value={trip.routeKm} onChange={(n) => setTrip({ ...trip, routeKm: n })} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Pickup
              <div className="flex flex-wrap gap-1">
                <Input type="date" value={trip.rideDate} onChange={(e) => setTrip({ ...trip, rideDate: e.target.value })} className="h-8 w-36 text-sm" />
                <Input type="time" value={trip.rideTime} onChange={(e) => setTrip({ ...trip, rideTime: e.target.value })} className="h-8 w-28 text-sm" />
              </div>
            </label>
            {trip.tripType === "ROUND_TRIP" && (
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Return
                <Input type="date" value={trip.returnDate} onChange={(e) => setTrip({ ...trip, returnDate: e.target.value })} className="h-8 w-36 text-sm" />
              </label>
            )}
            <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? "Calculating..." : "Calculate"}
            </Button>
          </div>

          {preview && (
            <div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
                {preview.map((fare) => (
                  <div key={fare.name} className={`rounded-lg border border-slate-200 p-3 text-xs ${fare.isActive ? "" : "opacity-40"}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{fare.name}</span>
                      <span className="text-sm font-bold text-slate-900">{rupees(fare.totalAmount)}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-500">
                      <dt>Billable km</dt>
                      <dd className="text-right text-slate-800">
                        {fare.billableKm}
                        {fare.billableKm !== fare.actualKm && <span className="ml-1 text-amber-700">(min)</span>}
                      </dd>
                      <dt>Vehicle fare</dt>
                      <dd className="text-right text-slate-800">{rupees(fare.vehicleFare)} @ ₹{fare.ratePerKm}</dd>
                      <dt>Allowances</dt>
                      <dd className="text-right text-slate-800">{rupees(fare.driverAllowance + fare.nightAllowance)}</dd>
                      <dt>Platform + tax</dt>
                      <dd className="text-right text-slate-800">{rupees(fare.platformCharges + fare.taxes)}</dd>
                      <dt>Partner gets</dt>
                      <dd className="text-right font-medium text-emerald-700">{rupees(fare.partnerPayout)}</dd>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Vehicle</TableHead>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Billable km</TableHead>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Vehicle fare</TableHead>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Allowances</TableHead>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Platform + tax</TableHead>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Rider pays</TableHead>
                    <TableHead className="h-9 text-[11px] font-medium text-slate-500">Partner gets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((fare) => (
                    <TableRow key={fare.name} className={fare.isActive ? "" : "opacity-40"}>
                      <TableCell className="py-1.5 font-medium">{fare.name}</TableCell>
                      <TableCell className="py-1.5">
                        {fare.billableKm}
                        {fare.billableKm !== fare.actualKm && <span className="ml-1 text-xs text-amber-700">(min applied)</span>}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {rupees(fare.vehicleFare)} <span className="text-xs text-slate-400">@ ₹{fare.ratePerKm}</span>
                      </TableCell>
                      <TableCell className="py-1.5">{rupees(fare.driverAllowance + fare.nightAllowance)}</TableCell>
                      <TableCell className="py-1.5">{rupees(fare.platformCharges + fare.taxes)}</TableCell>
                      <TableCell className="py-1.5 font-semibold">{rupees(fare.totalAmount)}</TableCell>
                      <TableCell className="py-1.5">{rupees(fare.partnerPayout)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {trip.tripType === "ROUND_TRIP" ? `${preview[0]?.days ?? 0} day(s). ` : ""}
                &ldquo;Min applied&rdquo; means the minimum km/day was higher than the actual distance driven.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </FleetPage>
  );
}
