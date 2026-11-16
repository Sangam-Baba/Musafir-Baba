"use client";
// Master lists (MusafirBaba staff): cities with areas, amenities, property types, bed types, meal plans. Add, rename,
// reorder and switch off — nothing is deleted, so listings that use an entry keep working.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GST_STATES } from "../../kyc";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetPanel, fleetSelectClass, Input, inputSm, PrimaryBtn, SecondaryBtn } from "./kit";

type Kind = "cities" | "amenities" | "property-types" | "bed-types" | "meal-plans";
type Entry = { id: string; key?: string; slug?: string; name: string; order: number; active: boolean; level?: string; group?: string; code?: string; stateCode?: string; lat?: number; lng?: number; radiusKm?: number; areas?: { id: string; name: string; active: boolean }[] };
type AllMasters = { cities: Entry[]; amenities: Entry[]; propertyTypes: Entry[]; bedTypes: Entry[]; mealPlans: Entry[] };
const KINDS: { kind: Kind; label: string; field: keyof AllMasters }[] = [
  { kind: "cities", label: "Cities & areas", field: "cities" },
  { kind: "amenities", label: "Amenities", field: "amenities" },
  { kind: "property-types", label: "Property types", field: "propertyTypes" },
  { kind: "bed-types", label: "Bed types", field: "bedTypes" },
  { kind: "meal-plans", label: "Meal plans", field: "mealPlans" },
];

function useCall(token: string) {
  const queryClient = useQueryClient();
  return async (path: string, method: "POST" | "PATCH", body: unknown, ok: string) => {
    try {
      await adminCall(path, token, { method, body });
      toast.success(ok);
      await queryClient.invalidateQueries({ queryKey: ["b2b-admin", "masters"] });
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };
}

function Row({ entry, kind, token }: { entry: Entry; kind: Kind; token: string }) {
  const call = useCall(token);
  const [name, setName] = useState(entry.name);
  const [order, setOrder] = useState(entry.order);
  const [area, setArea] = useState("");
  const base = kind === "cities" ? `/admin/masters/cities/${entry.id}` : `/admin/masters/${kind}/${entry.id}`;
  return (
    <div className={`space-y-2 px-4 py-2 ${entry.active ? "" : "bg-slate-50 opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-32 truncate font-mono text-[11px] text-slate-500">{entry.key ?? entry.slug}</span>
        <Input className={`${inputSm} w-56`} value={name} onChange={(e) => setName(e.target.value)} />
        <Input className={`${inputSm} w-20`} type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        {entry.level && <span className="text-[11px] text-slate-500">{entry.level.toLowerCase()} · {entry.group}</span>}
        {entry.code && <span className="text-[11px] text-slate-500">{entry.code}</span>}
        {kind === "cities" && <span className="text-[11px] text-slate-500">state {entry.stateCode} · {entry.radiusKm} km</span>}
        <span className="flex-1" />
        <SecondaryBtn disabled={name === entry.name && order === entry.order} onClick={() => call(base, "PATCH", { name, order }, "Saved")}>Save</SecondaryBtn>
        <SecondaryBtn danger={entry.active} onClick={() => call(base, "PATCH", { active: !entry.active }, entry.active ? "Switched off" : "Switched on")}>
          {entry.active ? "Switch off" : "Switch on"}
        </SecondaryBtn>
      </div>
      {kind === "cities" && (
        <div className="flex flex-wrap items-center gap-1.5 pl-32">
          {entry.areas?.map((a) => (
            <button key={a.id} title={a.active ? "Switch off" : "Switch on"} onClick={() => call(`${base}/areas/${a.id}`, "PATCH", { active: !a.active }, "Area updated")} className={`rounded-full border px-2 py-0.5 text-[11px] ${a.active ? "border-slate-300 text-slate-700" : "border-dashed border-slate-300 text-slate-400 line-through"}`}>
              {a.name}
            </button>
          ))}
          <Input className={`${inputSm} w-40`} placeholder="New area" value={area} onChange={(e) => setArea(e.target.value)} />
          <SecondaryBtn disabled={area.trim().length < 2} onClick={async () => (await call(`${base}/areas`, "POST", { name: area.trim() }, "Area added")) && setArea("")}>Add area</SecondaryBtn>
        </div>
      )}
    </div>
  );
}

function AddForm({ kind, token }: { kind: Kind; token: string }) {
  const call = useCall(token);
  const [f, setF] = useState({ key: "", name: "", level: "PROPERTY", group: "Basics", code: "", stateCode: "07", lat: "", lng: "", radiusKm: "25" });
  const body =
    kind === "cities"
      ? { name: f.name, stateCode: f.stateCode, lat: Number(f.lat), lng: Number(f.lng), radiusKm: Number(f.radiusKm) }
      : kind === "amenities"
        ? { key: f.key, name: f.name, level: f.level, group: f.group }
        : kind === "meal-plans"
          ? { key: f.key, code: f.code.toUpperCase(), name: f.name }
          : { key: f.key, name: f.name };
  const path = kind === "cities" ? "/admin/masters/cities" : `/admin/masters/${kind}`;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
      {kind !== "cities" && <Input className={`${inputSm} w-36`} placeholder="key (e.g. ev-charging)" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} />}
      <Input className={`${inputSm} w-48`} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      {kind === "amenities" && (
        <>
          <select className={fleetSelectClass} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
            <option value="PROPERTY">Property</option>
            <option value="ROOM">Room</option>
            <option value="BOTH">Both</option>
          </select>
          <Input className={`${inputSm} w-32`} placeholder="Group" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} />
        </>
      )}
      {kind === "meal-plans" && <Input className={`${inputSm} w-20`} placeholder="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />}
      {kind === "cities" && (
        <>
          <select className={fleetSelectClass} value={f.stateCode} onChange={(e) => setF({ ...f, stateCode: e.target.value })}>
            {GST_STATES.map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </select>
          <Input className={`${inputSm} w-24`} placeholder="Latitude" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
          <Input className={`${inputSm} w-24`} placeholder="Longitude" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
          <Input className={`${inputSm} w-20`} placeholder="Radius km" value={f.radiusKm} onChange={(e) => setF({ ...f, radiusKm: e.target.value })} />
        </>
      )}
      <PrimaryBtn disabled={f.name.trim().length < 2} onClick={async () => (await call(path, "POST", body, "Added")) && setF({ ...f, key: "", name: "", code: "", lat: "", lng: "" })}>
        Add
      </PrimaryBtn>
    </div>
  );
}

export function MastersTab({ token }: { token: string }) {
  const [kind, setKind] = useState<Kind>("cities");
  const masters = useQuery({ queryKey: ["b2b-admin", "masters"], queryFn: () => adminCall<AllMasters>("/admin/masters", token) });
  const current = KINDS.find((k) => k.kind === kind) ?? KINDS[0];
  const list = masters.data?.[current.field] ?? [];
  return (
    <FleetPanel
      title="Master lists"
      description="What hotels choose from. Switched-off entries disappear for hotels but keep working on existing listings."
      actions={
        <select aria-label="List" className={fleetSelectClass} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
      }
      bodyClassName="divide-y divide-slate-100"
    >
      {masters.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {list.map((e) => (
            <Row key={`${e.id}-${e.name}-${e.order}-${e.active}`} entry={e} kind={kind} token={token} />
          ))}
          <AddForm key={kind} kind={kind} token={token} />
        </>
      )}
    </FleetPanel>
  );
}
