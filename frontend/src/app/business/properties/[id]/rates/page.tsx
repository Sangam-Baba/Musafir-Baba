"use client";
// Rooms & rates of one property (Stage 04): the calendar (rooms, prices, rules per night; bulk changes with preview and
// undo; live updates when bookings land), rate plans, cancellation policies, calendar files and the change history.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FileSpreadsheet, FileText, History, Layers } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { b2b, refreshBusinessSession } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { fieldCls } from "@/b2b/components/rates/ui";
import { PageHeader, Panel, Tabs } from "@/b2b/components/portal/ui";
import { BulkEditor, type EditorState } from "@/b2b/components/rates/BulkEditor";
import { CalendarGrid, pickRange } from "@/b2b/components/rates/CalendarGrid";
import { HistoryPanel } from "@/b2b/components/rates/HistoryPanel";
import { ImportPanel } from "@/b2b/components/rates/ImportPanel";
import { PoliciesPanel } from "@/b2b/components/rates/PoliciesPanel";
import { RatePlansPanel } from "@/b2b/components/rates/RatePlansPanel";
import { addDays, type Calendar } from "@/b2b/inventory";
import type { Masters, Property, RoomType } from "@/b2b/listing";
import { errorMessage } from "@/b2b/messages";
import { useRealtime } from "@/b2b/realtime";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

type Tab = "calendar" | "plans" | "policies" | "import" | "history";

export default function RatesPage() {
  const params = useParams<{ id: string }>();
  return <BusinessShell>{(me) => <Rates id={params.id} me={me} />}</BusinessShell>;
}

function CalendarTab({ id, canManage }: { id: string; canManage: boolean }) {
  const token = useBusinessSession((s) => s.accessToken);
  const viewing = useBusinessSession((s) => s.viewAs);
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(30);
  const [guests, setGuests] = useState(2);
  const [editor, setEditor] = useState<EditorState>({ target: null, from, to: addDays(from, 1) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["b2b", "calendar", id] });
  const live = useRealtime({
    enabled: Boolean(token),
    rooms: [`availability:property:${id}`],
    getToken: async (expired) => (expired ? (viewing ? null : refreshBusinessSession()) : useBusinessSession.getState().accessToken),
    onMessage: (m) => {
      if (m.event === "availability:changed") refresh();
    },
    onSync: refresh,
  });
  const cal = useQuery({
    queryKey: ["b2b", "calendar", id, from, days, token],
    queryFn: () => b2b<Calendar>(`/hotel/properties/${id}/calendar?from=${from}&to=${addDays(from, days)}`),
    refetchInterval: live === "live" ? false : 60_000, // no live connection: refresh every minute
  });
  if (cal.error) return <p className="text-sm text-red-700">{errorMessage(cal.error)}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-[13px]">
        <button onClick={() => setFrom(addDays(from, -days))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5">← Earlier</button>
        <input type="date" className={`${fieldCls} w-40`} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <button onClick={() => setFrom(addDays(from, days))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5">Later →</button>
        <select className={`${fieldCls} w-32`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[30, 60, 90].map((d) => (
            <option key={d} value={d}>{d} nights</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-slate-600">
          Prices for
          <select className={`${fieldCls} w-24`} value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1, 2, 3, 4].map((g) => (
              <option key={g} value={g}>{g} guest{g > 1 ? "s" : ""}</option>
            ))}
          </select>
        </label>
        <span className={`ml-auto text-xs ${live === "live" ? "text-emerald-600" : "text-slate-400"}`}>{live === "live" ? "● Live" : "○ Updating every minute"}</span>
      </div>
      {cal.isLoading || !cal.data ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : cal.data.roomTypes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Add room types on the property page first.</p>
      ) : (
        <>
          <CalendarGrid cal={cal.data} guests={guests} onPick={(target, date) => canManage && setEditor({ target, ...pickRange(date) })} />
          <p className="text-xs text-slate-500">Rooms (free) · prices before tax · red = not selling · grey = past. {canManage ? "Click a cell to change it, or use the form below for many nights." : ""}</p>
          {canManage && (
            <Panel icon={CalendarDays} title="Change many nights" subtitle="Pick the nights, preview, then apply. Rooms never go below what guests have booked.">
              <BulkEditor cal={cal.data} propertyId={id} state={editor} onState={setEditor} onChanged={refresh} />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function Rates({ id, me }: { id: string; me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("calendar");
  const property = useQuery({ queryKey: ["b2b", "property", id, token], queryFn: () => b2b<Property>(`/hotel/properties/${id}`) });
  const rooms = useQuery({ queryKey: ["b2b", "rooms", id, token], queryFn: () => b2b<{ data: RoomType[] }>(`/hotel/properties/${id}/room-types`) });
  const masters = useQuery({ queryKey: ["b2b", "masters"], queryFn: () => b2b<Masters>("/catalog/masters"), staleTime: 300_000 });
  const canRead = me.permissions.includes("hotel-inventory.calendar.read");
  const canManage = me.permissions.includes("hotel-inventory.calendar.manage") && !me.viewAs;
  if (!canRead) return <p className="text-sm text-slate-600">Your role doesn&apos;t include rooms and rates.</p>;
  if (property.isLoading || masters.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!property.data || !masters.data) return <p className="text-sm text-red-700">{errorMessage(property.error ?? masters.error)}</p>;
  const roomList = rooms.data?.data ?? [];
  const refreshCalendar = () => {
    void queryClient.invalidateQueries({ queryKey: ["b2b", "calendar", id] });
    void queryClient.invalidateQueries({ queryKey: ["b2b", "calendar-changes", id] });
  };
  return (
    <div className="space-y-4">
      <PageHeader
        crumb="My Properties"
        title={property.data.name}
        highlight="· Rooms & rates"
        subtitle="How many rooms you give MusafirBaba each night, your prices (before tax) and the rules."
        actions={<Link href={`/business/properties/${id}`} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 hover:border-[#FE5300]">← Property details</Link>}
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "calendar", label: "Calendar", icon: CalendarDays },
          { value: "plans", label: "Rate plans", icon: Layers },
          { value: "policies", label: "Cancellation policies", icon: FileText },
          ...(canManage ? [{ value: "import" as const, label: "Import file", icon: FileSpreadsheet }] : []),
          { value: "history", label: "Changes", icon: History },
        ]}
      />
      {tab === "calendar" && <CalendarTab id={id} canManage={canManage} />}
      {tab === "plans" && <RatePlansPanel propertyId={id} rooms={roomList} masters={masters.data} canManage={canManage} />}
      {tab === "policies" && <PoliciesPanel propertyId={id} canManage={canManage} />}
      {tab === "import" && canManage && <ImportPanel propertyId={id} onApplied={refreshCalendar} />}
      {tab === "history" && <HistoryPanel propertyId={id} canManage={canManage} onChanged={refreshCalendar} />}
    </div>
  );
}
