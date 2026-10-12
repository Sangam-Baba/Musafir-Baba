"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock,
  IndianRupee,
  Info,
  LayoutDashboard,
  MapPin,
  Navigation,
  RefreshCw,
  Smartphone,
  UserMinus,
  UserPlus,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { FleetKpiStrip, FleetPage, FleetPageHeader, FleetPanel, FleetEmptyState } from "@/components/admin/fleet/FleetUI";

type Range = "7d" | "30d" | "90d" | "all";

interface FleetAnalytics {
  range: Range;
  generatedAt: string;
  bucket: "day" | "week";
  mbgo: { totalUsers: number; newUsers: number; activeUsers: number; inactiveUsers: number; devices: number; verifiedUsers: number };
  mbconnect: {
    totalPartners: number;
    newPartners: number;
    approvedPartners: number;
    pendingVerification: number;
    onlineNow: number;
    activePartners: number;
    inactivePartners: number;
    devices: number;
    statusBreakdown: { status: string; count: number }[];
  };
  rides: {
    total: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    awaitingPartner: number;
    paymentPending: number;
    gmv: number;
    commission: number;
    partnerPayout: number;
    avgFare: number;
    cancellationRate: number;
  };
  funnel: { stage: string; count: number }[];
  signupTrend: { date: string; riders: number; partners: number }[];
  rideTrend: { date: string; completed: number; inProgress: number; cancelled: number; unpaid: number }[];
  vehicleSplit: { name: string; value: number }[];
  tripTypeSplit: { name: string; value: number }[];
  topCities: { name: string; value: number }[];
  topPartners: { id: string; name: string; mobile: string; rides: number; earnings: number }[];
  topRiders: { id: string; name: string; mobile: string; bookings: number; completed: number; spent: number }[];
  attention: {
    manualAssignment: number;
    awaitingPartner: number;
    partnersPendingVerification: number;
    riderDocsPending: number;
    partnerDocsPending: number;
  };
}

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

const RANGE_TEXT: Record<Range, string> = {
  "7d": "in the last 7 days",
  "30d": "in the last 30 days",
  "90d": "in the last 90 days",
  all: "all time",
};

// Brand-aligned, colour-blind-friendly palette
const C = {
  orange: "#FE5300",
  sky: "#0284c7",
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#94a3b8",
  violet: "#7c3aed",
};
const DONUT_COLORS = [C.orange, C.sky, C.emerald, C.violet, C.amber, C.slate, C.red];

const PARTNER_STATUS_LABEL: Record<string, string> = {
  Active: "Active",
  Approved: "Approved",
  PendingVerification: "Pending review",
  Hold: "On hold",
  Rejected: "Rejected",
  Blacklisted: "Blacklisted",
  Suspended: "Suspended",
  "In-Active": "Inactive",
  Draft: "Draft (incomplete)",
};

const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const fetchAnalytics = async (accessToken: string, range: Range): Promise<FleetAnalytics> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/fleet-analytics?range=${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load fleet analytics");
  return json.data;
};

// Small "i" with a plain-language explanation on hover
function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info size={12} className="text-slate-400" />
      <span className="pointer-events-none absolute left-1/2 top-5 z-20 hidden w-60 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-2 text-[11px] font-normal normal-case leading-snug tracking-normal text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function AppSectionTitle({ name, tag, tone, hint }: { name: string; tag: string; tone: string; hint: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold text-white ${tone}`}>{name}</span>
      <span className="text-[12px] text-slate-500">{tag}</span>
      <Hint text={hint} />
    </div>
  );
}

function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-md">
      {label && <p className="mb-1 font-medium text-slate-700">{label.length === 10 ? shortDate(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-slate-900">{money ? rupees(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function Donut({ data, emptyText }: { data: { name: string; value: number }[]; emptyText: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-10 text-center text-[12px] text-slate-400">{emptyText}</p>;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-slate-900">{total}</span>
          <span className="text-[10px] text-slate-500">total</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-900">
              {d.value} <span className="text-slate-400">({Math.round((d.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type AttentionItem = { label: string; value: number; href: string; icon: React.ElementType };

function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <FleetPanel title="Needs attention" description="Open items right now (not limited to the selected period)" icon={AlertTriangle}>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
              <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-slate-700">
                <item.icon size={14} className={item.value > 0 ? "text-amber-500" : "text-slate-300"} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={`min-w-[28px] rounded-full px-2 py-0.5 text-center text-[12px] font-semibold tabular-nums ${
                    item.value > 0 ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {item.value}
                </span>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </FleetPanel>
  );
}

function LeaderTable({
  title,
  description,
  icon,
  emptyText,
  columns,
  rows,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof FleetPanel>["icon"];
  emptyText: string;
  columns: string[];
  rows: { id: string; name: string; mobile: string; values: React.ReactNode[] }[];
}) {
  return (
    <FleetPanel title={title} description={description} icon={icon}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                {columns.map((c, i) => (
                  <th key={c} className={`px-4 py-2 text-[11px] font-medium text-slate-500 ${i > 0 ? "text-right" : ""}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 text-[11px] tabular-nums text-slate-400">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{row.name}</p>
                        <p className="text-[11px] tabular-nums text-slate-500">{row.mobile}</p>
                      </div>
                    </div>
                  </td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-4 py-2.5 text-right tabular-nums text-slate-900">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <FleetEmptyState icon={icon || Users} title={emptyText} />
      )}
    </FleetPanel>
  );
}

export default function FleetDashboardPage() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const permissions = useAdminAuthStore((s) => s.permissions) as string[];
  const role = useAdminAuthStore((s) => s.role);
  const [range, setRange] = useState<Range>("30d");
  const [appTab, setAppTab] = useState<"mbgo" | "mbconnect">("mbgo");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["fleetAnalytics", range],
    queryFn: () => fetchAnalytics(accessToken, range),
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });

  if (!(role === "admin" || role === "superadmin" || permissions?.includes("partner-verification"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }

  const rangeText = RANGE_TEXT[range];

  return (
    <FleetPage>
      <FleetPageHeader
        icon={LayoutDashboard}
        title="Fleet Dashboard"
        description="How the MBGO rider app and MBConnect partner app are doing — pick an app below."
        actions={
          <>
            <div className="inline-flex rounded-md bg-slate-100/80 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`h-7 rounded px-2.5 text-[12px] font-medium transition-colors ${
                    range === r.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => refetch()}
              title="Refresh"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-slate-50 hover:text-slate-800"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader size="lg" message="Loading fleet analytics..." />
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {String((error as Error)?.message || "Could not load analytics")}
        </div>
      ) : (
        <>
          {/* ---------- App tabs ---------- */}
          <div className="flex flex-col gap-2 border-b border-slate-200 sm:flex-row sm:items-end sm:justify-between">
            <nav className="-mb-px flex gap-1">
              {([
                { key: "mbgo", name: "MBGO", tag: "Rider app", dot: "bg-[#FE5300]", count: data.mbgo.totalUsers },
                { key: "mbconnect", name: "MBConnect", tag: "Partner app", dot: "bg-sky-600", count: data.mbconnect.totalPartners },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setAppTab(t.key)}
                  className={`inline-flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors ${
                    appTab === t.key ? "border-[#FE5300] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                  {t.name}
                  <span className="text-[12px] font-normal text-slate-400">{t.tag}</span>
                  <span className="rounded bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-600">{t.count}</span>
                </button>
              ))}
            </nav>
            <p className="pb-2.5 text-[11px] text-slate-400">Showing {rangeText}</p>
          </div>

          {appTab === "mbgo" ? (
            <>
              {/* ===================== MBGO (rider app) ===================== */}
              <div>
                <AppSectionTitle
                  name="Riders"
                  tag="MBGO users"
                  tone="bg-[#FE5300]"
                  hint="New = signed up in the selected period. Active = booked a ride or logged in during the selected period. Inactive = no booking or login in the last 30 days. Devices = phones with the app installed, logged in and notifications allowed (installs aren't reported by the app)."
                />
                <FleetKpiStrip
                  items={[
                    { label: "Total riders", value: data.mbgo.totalUsers, icon: Users, tone: "slate" },
                    { label: "New sign-ups", value: data.mbgo.newUsers, icon: UserPlus, tone: "sky" },
                    { label: "Active", value: data.mbgo.activeUsers, icon: Activity, tone: "emerald" },
                    { label: "Inactive (30 days)", value: data.mbgo.inactiveUsers, icon: UserMinus, tone: "red" },
                  ]}
                />
                <div className="mt-3">
                  <FleetKpiStrip
                    items={[
                      { label: "Notification-enabled devices", value: data.mbgo.devices, icon: Smartphone, tone: "slate" },
                      { label: "Verified riders", value: data.mbgo.verifiedUsers, icon: BadgeCheck, tone: "emerald" },
                      { label: "Bookings not paid", value: data.rides.paymentPending, icon: Clock, tone: "amber" },
                      { label: "Average fare", value: rupees(data.rides.avgFare), icon: IndianRupee, tone: "slate" },
                    ]}
                  />
                </div>
              </div>

              <div>
                <AppSectionTitle
                  name="Rides"
                  tag={`Booked by riders ${rangeText}`}
                  tone="bg-slate-800"
                  hint="Fare collected counts completed rides only. Cancellation rate = cancelled ÷ all rides booked in the period."
                />
                <FleetKpiStrip
                  items={[
                    { label: "Rides booked", value: data.rides.total, icon: CarFront, tone: "slate" },
                    { label: "Completed", value: data.rides.completed, icon: CheckCircle2, tone: "emerald" },
                    { label: "Cancelled", value: data.rides.cancelled, icon: XCircle, tone: "red" },
                    { label: "Fare collected", value: rupees(data.rides.gmv), icon: IndianRupee, tone: "orange" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <FleetPanel title="New rider sign-ups" description={`Riders joining MBGO ${rangeText}, per ${data.bucket}`} icon={UserPlus}>
                  <div className="h-64 px-2 py-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.signupTrend} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gRiders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.orange} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={C.orange} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="riders" name="New riders" stroke={C.orange} strokeWidth={2} fill="url(#gRiders)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </FleetPanel>

                <FleetPanel title="Rides per day" description={`Every ride booked ${rangeText}, by where it ended up`} icon={CarFront}>
                  <div className="h-64 px-2 py-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.rideTrend} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="completed" name="Completed" stackId="r" fill={C.emerald} />
                        <Bar dataKey="inProgress" name="In progress / waiting" stackId="r" fill={C.sky} />
                        <Bar dataKey="cancelled" name="Cancelled" stackId="r" fill={C.red} />
                        <Bar dataKey="unpaid" name="Payment pending" stackId="r" fill={C.slate} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </FleetPanel>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <FleetPanel title="Booking funnel" description="How many booked rides reach each step" icon={BarChart3} bodyClassName="p-4">
                  {data.funnel[0]?.count ? (
                    <div className="space-y-3">
                      {data.funnel.map((step, i) => {
                        const pct = Math.round((step.count / data.funnel[0].count) * 100);
                        const drop = i > 0 ? data.funnel[i - 1].count - step.count : 0;
                        return (
                          <div key={step.stage}>
                            <div className="mb-1 flex items-center justify-between text-[12px]">
                              <span className="font-medium text-slate-700">{step.stage}</span>
                              <span className="tabular-nums text-slate-900">
                                {step.count} <span className="text-slate-400">· {pct}%</span>
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, step.count ? 3 : 0)}%`, background: [C.slate, C.sky, C.orange, C.emerald][i] }} />
                            </div>
                            {drop > 0 && <p className="mt-0.5 text-[11px] text-slate-400">{drop} dropped at this step</p>}
                          </div>
                        );
                      })}
                      {data.rides.paymentPending > 0 && (
                        <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                          {data.rides.paymentPending} of {data.rides.total} bookings never completed payment.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="py-10 text-center text-[12px] text-slate-400">No rides booked {rangeText}</p>
                  )}
                </FleetPanel>

                <FleetPanel title="Rides by vehicle" description={`Vehicle type chosen by riders ${rangeText}`} icon={CarFront} bodyClassName="p-4">
                  <Donut data={data.vehicleSplit} emptyText={`No rides booked ${rangeText}`} />
                </FleetPanel>

                <FleetPanel title="Trip type" description={`One way vs round trip ${rangeText}`} icon={Navigation} bodyClassName="p-4">
                  <Donut
                    data={data.tripTypeSplit.map((t) => ({ ...t, name: t.name === "Unknown" ? "Not recorded (older rides)" : t.name }))}
                    emptyText={`No rides booked ${rangeText}`}
                  />
                </FleetPanel>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <FleetPanel title="Top pickup cities" description={`Where rides were booked from ${rangeText}`} icon={MapPin}>
                  {data.topCities.length ? (
                    <div className="px-2 py-4" style={{ height: Math.max(160, data.topCities.length * 40 + 30) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topCities} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#334155" }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                          <Bar dataKey="value" name="Rides" fill={C.orange} radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <FleetEmptyState icon={MapPin} title={`No rides booked ${rangeText}`} />
                  )}
                </FleetPanel>

                <div className="flex min-w-0 flex-col gap-5">
                  <AttentionList
                    items={[
                      { label: "Rider ID documents to review", value: data.attention.riderDocsPending, href: "/admin/rider-verification", icon: Users },
                      { label: "Paid rides waiting for a partner", value: data.attention.awaitingPartner, href: "/admin/ride-bookings", icon: Clock },
                    ]}
                  />
                  <LeaderTable
                    title="Top riders"
                    description={`Most rides booked ${rangeText}`}
                    icon={Users}
                    emptyText={`No rides booked ${rangeText}`}
                    columns={["Rider", "Booked", "Completed", "Spent"]}
                    rows={data.topRiders.map((r) => ({ id: r.id, name: r.name, mobile: r.mobile, values: [r.bookings, r.completed, rupees(r.spent)] }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ===================== MBConnect (partner app) ===================== */}
              <div>
                <AppSectionTitle
                  name="Partners"
                  tag="MBConnect users"
                  tone="bg-sky-600"
                  hint="Approved = verified and allowed to take rides. Online now = currently switched to Online in the app. Active = logged in or was assigned a ride during the selected period. Inactive = no login or assigned ride in the last 30 days."
                />
                <FleetKpiStrip
                  items={[
                    { label: "Total partners", value: data.mbconnect.totalPartners, icon: Users, tone: "slate" },
                    { label: "New sign-ups", value: data.mbconnect.newPartners, icon: UserPlus, tone: "sky" },
                    { label: "Approved", value: data.mbconnect.approvedPartners, icon: BadgeCheck, tone: "emerald" },
                    { label: "Pending verification", value: data.mbconnect.pendingVerification, icon: Clock, tone: "amber" },
                  ]}
                />
                <div className="mt-3">
                  <FleetKpiStrip
                    items={[
                      { label: "Online now", value: data.mbconnect.onlineNow, icon: Wifi, tone: "sky" },
                      { label: "Active", value: data.mbconnect.activePartners, icon: Activity, tone: "emerald" },
                      { label: "Inactive (30 days)", value: data.mbconnect.inactivePartners, icon: UserMinus, tone: "red" },
                      { label: "Notification-enabled devices", value: data.mbconnect.devices, icon: Smartphone, tone: "slate" },
                    ]}
                  />
                </div>
              </div>

              <div>
                <AppSectionTitle
                  name="Trips & earnings"
                  tag={`Rides handled by partners ${rangeText}`}
                  tone="bg-slate-800"
                  hint="Payouts and commission count completed rides only. Rides older than the commission feature show ₹0 for those fields."
                />
                <FleetKpiStrip
                  items={[
                    { label: "Rides assigned", value: data.funnel.find((f) => f.stage === "Partner assigned")?.count ?? 0, icon: CarFront, tone: "slate" },
                    { label: "Rides completed", value: data.rides.completed, icon: CheckCircle2, tone: "emerald" },
                    { label: "Partner payouts", value: rupees(data.rides.partnerPayout), icon: IndianRupee, tone: "sky" },
                    { label: "Platform commission", value: rupees(data.rides.commission), icon: BarChart3, tone: "orange" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <FleetPanel title="New partner sign-ups" description={`Partners joining MBConnect ${rangeText}, per ${data.bucket}`} icon={UserPlus}>
                  <div className="h-64 px-2 py-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.signupTrend} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gPartners" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.sky} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={C.sky} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="partners" name="New partners" stroke={C.sky} strokeWidth={2} fill="url(#gPartners)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </FleetPanel>

                <FleetPanel title="Partner status" description="Where every MBConnect partner stands today" icon={BadgeCheck} bodyClassName="p-4">
                  <Donut
                    data={data.mbconnect.statusBreakdown.map((s) => ({ name: PARTNER_STATUS_LABEL[s.status] || s.status, value: s.count }))}
                    emptyText="No partners yet"
                  />
                </FleetPanel>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <AttentionList
                  items={[
                    { label: "Partners waiting for verification", value: data.attention.partnersPendingVerification, href: "/admin/fleet-verification", icon: BadgeCheck },
                    { label: "Partner documents to review", value: data.attention.partnerDocsPending, href: "/admin/fleet-verification", icon: BadgeCheck },
                    { label: "Rides needing manual assignment", value: data.attention.manualAssignment, href: "/admin/ride-bookings", icon: AlertTriangle },
                    { label: "Paid rides waiting for a partner", value: data.attention.awaitingPartner, href: "/admin/ride-bookings", icon: Clock },
                  ]}
                />
                <LeaderTable
                  title="Top partners"
                  description={`Most completed rides ${rangeText}`}
                  icon={BadgeCheck}
                  emptyText={`No completed rides ${rangeText}`}
                  columns={["Partner", "Rides", "Earnings"]}
                  rows={data.topPartners.map((p) => ({ id: p.id, name: p.name, mobile: p.mobile, values: [p.rides, rupees(p.earnings)] }))}
                />
              </div>
            </>
          )}

          <p className="text-center text-[11px] text-slate-400">
            Updated {new Date(data.generatedAt).toLocaleString("en-IN")} · Deleted riders and partners are excluded.
          </p>
        </>
      )}
    </FleetPage>
  );
}
