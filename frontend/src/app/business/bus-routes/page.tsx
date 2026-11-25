"use client";
// Routes & schedules (bus operators, Stage 18 B3): boarding / dropping points, routes (stops and times, sent to
// MusafirBaba for approval) and schedules (bus + days). Trips for 90 days ahead are made from schedules.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MapPin, Route as RouteIcon } from "lucide-react";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import type { Bus, BusRoute, BusSchedule, BusStop } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { RoutesPanel } from "@/b2b/components/bus/RoutesPanel";
import { SchedulesPanel } from "@/b2b/components/bus/SchedulesPanel";
import { StopsPanel } from "@/b2b/components/bus/StopsPanel";
import { PageHeader, Tabs } from "@/b2b/components/portal/ui";
import type { Masters } from "@/b2b/listing";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

type Tab = "routes" | "schedules" | "points";

export default function BusRoutesPage() {
  return <BusinessShell>{(me) => <BusRoutes me={me} />}</BusinessShell>;
}

function BusRoutes({ me }: { me: Me }) {
  const qc = useQueryClient();
  const token = useBusinessSession((s) => s.accessToken);
  const canRead = me.permissions.includes("bus-catalog.route.read");
  const canManage = me.permissions.includes("bus-catalog.route.manage") && !me.viewAs;
  const [tab, setTab] = useState<Tab>("routes");
  const k = (name: string) => ["b2b", "bus", name, token, me.currentOrgId];
  const stops = useQuery({ queryKey: k("stops"), queryFn: () => b2b<{ data: BusStop[] }>("/bus/stops"), enabled: canRead });
  const routes = useQuery({ queryKey: k("routes"), queryFn: () => b2b<{ data: BusRoute[] }>("/bus/routes"), enabled: canRead });
  const schedules = useQuery({ queryKey: k("schedules"), queryFn: () => b2b<{ data: BusSchedule[] }>("/bus/schedules"), enabled: canRead });
  const buses = useQuery({ queryKey: k("vehicles"), queryFn: () => b2b<{ data: Bus[] }>("/bus/vehicles"), enabled: canRead && me.permissions.includes("bus-catalog.vehicle.read") });
  const masters = useQuery({ queryKey: ["b2b", "masters"], queryFn: () => b2b<Masters>("/catalog/masters"), staleTime: 300_000 });
  if (!canRead) return <p className="text-[13px] text-slate-600">You don&apos;t have access to the routes of this company.</p>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["b2b", "bus"] });
  const points = stops.data?.data ?? [];
  return (
    <div className="space-y-4">
      <PageHeader crumb="Routes & schedules" title="Routes &" highlight="schedules" subtitle="Add your boarding points, build each route stop by stop, send it to MusafirBaba, then schedule a bus on it." />
      <Tabs<Tab>
        tabs={[
          { value: "routes", label: "Routes", icon: RouteIcon },
          { value: "schedules", label: "Schedules", icon: CalendarClock },
          { value: "points", label: `Points (${points.length})`, icon: MapPin },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "points" && <StopsPanel stops={points} cities={masters.data?.cities ?? []} canManage={canManage} onChanged={refresh} />}
      {tab === "routes" && <RoutesPanel routes={routes.data?.data ?? []} points={points} canManage={canManage} onChanged={refresh} />}
      {tab === "schedules" && <SchedulesPanel schedules={schedules.data?.data ?? []} routes={routes.data?.data ?? []} buses={buses.data?.data ?? []} canManage={canManage} onChanged={refresh} />}
    </div>
  );
}
