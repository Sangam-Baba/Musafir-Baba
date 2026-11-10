"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Activity,
  CalendarCheck,
  Car,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquareText,
  Newspaper,
  Package,
  PenLine,
  Plane,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FleetPage, FleetPanel, FleetPill, fleetTone } from "@/components/admin/fleet/FleetUI";
import { AdminPageHeader } from "@/components/admin/AdminFormUI";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  YAxis,
  XAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AllCount {
  packageCount: number;
  bookingCount: number;
  customizedPackageCount: number;
  customizedBookingCount: number;
  customizedTourPackageCount: number;
  customizedTourBookingCount: number;
  userCount: number;
  membershipBookingCount: number;
  newsCount: number;
  blogCount: number;
  contactEnquiryCount: number;
}

// Shape of GET /dashboard/overview. Every value can be null (that count failed
// on the server) and the whole object can be missing (older backend), so the
// page never assumes any of it exists.
// Scope: packages, package bookings, enquiries, blogs, news, vehicle rentals.
// Fleet management is intentionally not on this dashboard.
type Overview = Partial<Record<
  | "packagesTotal" | "packagesPublished" | "packagesDraft" | "packagesPendingApproval" | "packagesThisMonth"
  | "customTourPackagesTotal" | "customTourPackagesPublished" | "customTourPackagesPendingApproval"
  | "holidayBookingsTotal" | "holidayBookingsConfirmed" | "holidayBookingsPending" | "holidayBookingsCancelled"
  | "holidayBookingsThisMonth" | "holidayBookingsLastMonth"
  | "customTourBookingsTotal" | "customTourBookingsConfirmed" | "customTourBookingsPending" | "customTourBookingsCancelled"
  | "customTourBookingsThisMonth" | "customTourBookingsLastMonth"
  | "enquiriesTotal" | "enquiriesVisa" | "enquiriesThisMonth" | "enquiriesLastMonth"
  | "blogsPublished" | "blogsDraft" | "blogsThisMonth" | "blogsLastMonth"
  | "newsPublished" | "newsDraft" | "newsThisMonth" | "newsLastMonth"
  | "vehiclesTotal" | "vehiclesPublished" | "vehiclesDraft"
  | "vehicleBookingsTotal" | "vehicleBookingsConfirmed" | "vehicleBookingsPending" | "vehicleBookingsCancelled"
  | "vehicleBookingsThisMonth" | "vehicleBookingsLastMonth",
  number | null
>>;

const authHeaders = (accessToken: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
});

const getDashBoardSummary = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, {
    method: "GET",
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
};

const getDashboardOverview = async (accessToken: string): Promise<Overview> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/overview`, {
    method: "GET",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard overview");
  const data = await res.json();
  return data?.data ?? {};
};

const getMonthlyBookings = async (accessToken: string, start?: string, end?: string) => {
  const params = new URLSearchParams();
  if (start) params.append("start", start.toString());
  if (end) params.append("end", end.toString());
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/monthly-bookings?${params.toString()}`,
    { method: "GET", headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  const data = await res.json();
  return data?.data;
};

const getVisaVsBooking = async (accessToken: string, start?: string, end?: string) => {
  const params = new URLSearchParams();
  if (start) params.append("start", start.toString());
  if (end) params.append("end", end.toString());
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/visa-vs-booking?${params.toString()}`,
    { method: "GET", headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  const data = await res.json();
  return data?.data;
};

const getLatestActivity = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/latest-activity`, {
    method: "GET",
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  const data = await res.json();
  return data?.data ?? {};
};

// ---------- helpers ----------

const fmt = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-IN") : "--";

/** Adds numbers, treating missing ones as 0; returns undefined only if all are missing. */
const sum = (...vals: (number | null | undefined)[]) => {
  const present = vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return present.length ? present.reduce((a, b) => a + b, 0) : undefined;
};

const pct = (part: number | null | undefined, total: number | null | undefined) =>
  typeof part === "number" && typeof total === "number" && total > 0 ? Math.round((part / total) * 100) : 0;

/** Month keys (YYYY-MM) for the chart range, so months with no data still show as 0. */
function monthRange(start: string, end: string) {
  const endDate = end ? new Date(end) : new Date();
  const startDate = start ? new Date(start) : new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return [];
  const keys: string[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  // Hard cap so a very wide custom range can't build a huge array.
  while (cur <= endDate && keys.length < 60) {
    keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key: string, multiYear: boolean) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", multiYear ? { month: "short", year: "2-digit" } : { month: "short" });
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const TONE_ICON = {
  orange: "bg-orange-50 text-[#FE5300] ring-orange-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-500 ring-slate-200",
} as const;
type Tone = keyof typeof TONE_ICON;

const BAR_TONE: Record<Tone, string> = {
  orange: "bg-[#FE5300]",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px -8px rgba(16,24,40,0.18)",
  fontSize: 12,
  padding: "8px 10px",
};

// ---------- presentational pieces (page-local) ----------

function Delta({ current, previous }: { current?: number | null; previous?: number | null }) {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  if (previous === 0 && current === 0) {
    return <span className="text-[11px] font-medium text-slate-400">None so far this month</span>;
  }
  // Server compares month-to-date with the same days of last month.
  const diff = current - previous;
  const up = diff >= 0;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", up ? "text-emerald-600" : "text-rose-600")}
      title={`${fmt(current)} this month vs ${fmt(previous)} in the same days last month`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmt(current)} this month
      <span className="font-normal text-slate-400">
        {" "}· {up ? "+" : "−"}{fmt(Math.abs(diff))} vs last month
      </span>
    </span>
  );
}

function HeroKpi({
  label,
  value,
  icon: Icon,
  tone,
  href,
  hint,
  current,
  previous,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone: Tone;
  href: string;
  hint?: React.ReactNode;
  current?: number | null;
  previous?: number | null;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_10px_30px_-12px_rgba(254,83,0,0.25)]"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-orange-100/0 to-orange-100/0 transition-all duration-500 group-hover:from-orange-100/70 group-hover:to-amber-50/40" />
      <div className="relative flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset", TONE_ICON[tone])}>
          <Icon size={16} />
        </div>
        <ArrowUpRight size={14} className="text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#FE5300]" />
      </div>
      <div className="relative min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold leading-tight tracking-tight tabular-nums text-slate-900">{value}</p>
        <div className="mt-1 min-h-[16px] truncate">
          {typeof current === "number" && typeof previous === "number" ? (
            <Delta current={current} previous={previous} />
          ) : (
            hint && <span className="text-[11px] text-slate-400">{hint}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatRow({
  label,
  value,
  tone = "slate",
  total,
  href,
}: {
  label: string;
  value: number | null | undefined;
  tone?: Tone;
  total?: number | null;
  href?: string;
}) {
  const showBar = typeof total === "number";
  const body = (
    <div className="group py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[12px] text-slate-600">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", BAR_TONE[tone])} />
          <span className="truncate group-hover:text-slate-900">{label}</span>
        </span>
        <span className="flex items-center gap-2">
          {showBar && <span className="text-[11px] tabular-nums text-slate-400">{pct(value, total)}%</span>}
          <span className="text-[13px] font-semibold tabular-nums text-slate-900">{fmt(value)}</span>
        </span>
      </div>
      {showBar && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={cn("h-full rounded-full transition-all duration-700", BAR_TONE[tone])} style={{ width: `${pct(value, total)}%` }} />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

function BreakdownPanel({
  title,
  icon,
  href,
  headline,
  headlineLabel,
  children,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  headline: React.ReactNode;
  headlineLabel: string;
  children: React.ReactNode;
}) {
  return (
    <FleetPanel
      title={title}
      icon={icon}
      actions={
        <Link href={href} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-[#FE5300]">
          Open <ArrowRight size={12} />
        </Link>
      }
      bodyClassName="px-4 pb-3 pt-3"
    >
      <div className="mb-1 flex items-baseline gap-2 border-b border-dashed border-slate-100 pb-3">
        <span className="text-xl font-semibold tracking-tight tabular-nums text-slate-900">{headline}</span>
        <span className="text-[11px] text-slate-500">{headlineLabel}</span>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </FleetPanel>
  );
}

function PanelLoading() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
    </div>
  );
}

function PanelError({ message }: { message?: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
      <AlertTriangle size={18} className="text-rose-400" />
      <p className="text-[12px] text-slate-500">{message || "Could not load this data."}</p>
    </div>
  );
}

// ---------- page ----------

function AdminDashBoard() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");

  const { data, isLoading, isError, error, refetch: refetchSummary, isFetching: isSummaryFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashBoardSummary(accessToken),
  });

  const {
    data: overview,
    refetch: refetchOverview,
    isFetching: isOverviewFetching,
    dataUpdatedAt: overviewUpdatedAt,
  } = useQuery({
    queryKey: ["dashboardOverview"],
    queryFn: () => getDashboardOverview(accessToken),
    enabled: !!accessToken,
    retry: 1,
  });

  const {
    data: bookings,
    isLoading: isBookingsLoading,
    isError: isBookingsError,
    error: bookingsError,
  } = useQuery({
    queryKey: ["bookings", start, end],
    queryFn: () => getMonthlyBookings(accessToken, start, end),
    enabled: !!accessToken,
  });

  const {
    data: visaVsBooking,
    isLoading: isVisaVsBookingLoading,
    isError: isVisaVsBookingError,
    error: visaVsBookingError,
  } = useQuery({
    queryKey: ["visaVsBooking", start, end],
    queryFn: () => getVisaVsBooking(accessToken, start, end),
    enabled: !!accessToken,
  });

  const {
    data: latestActivity,
    isLoading: isLatestActivityLoading,
    isError: isLatestActivityError,
    error: latestActivityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["latestActivity"],
    queryFn: () => getLatestActivity(accessToken),
    enabled: !!accessToken,
  });

  const allCounts: AllCount | undefined = data?.data;
  const ov: Overview = overview ?? {};
  const hasOverview = !!overview && Object.keys(overview).length > 0;

  // Chart data, zero-filled so empty months show instead of being skipped.
  const months = React.useMemo(() => monthRange(start, end), [start, end]);
  const multiYear = new Set(months.map((m) => m.slice(0, 4))).size > 1;

  const dataForLineChart = React.useMemo(() => {
    const byMonth = new Map<string, number>();
    (bookings ?? []).forEach((b: { month: string; count: number }) => {
      const k = monthKey(b.month);
      byMonth.set(k, (byMonth.get(k) ?? 0) + (Number(b.count) || 0));
    });
    const keys = months.length ? months : Array.from(byMonth.keys()).sort();
    return keys.map((k) => ({ month: monthLabel(k, multiYear), bookings: byMonth.get(k) ?? 0 }));
  }, [bookings, months, multiYear]);

  const dataForBarChart = React.useMemo(() => {
    const byMonth = new Map<string, { visa: number; bookings: number }>();
    (visaVsBooking ?? []).forEach((b: { month: string; visa: number; bookings: number }) => {
      const k = monthKey(b.month);
      const prev = byMonth.get(k) ?? { visa: 0, bookings: 0 };
      byMonth.set(k, { visa: prev.visa + (Number(b.visa) || 0), bookings: prev.bookings + (Number(b.bookings) || 0) });
    });
    const keys = months.length ? months : Array.from(byMonth.keys()).sort();
    return keys.map((k) => ({ month: monthLabel(k, multiYear), ...(byMonth.get(k) ?? { visa: 0, bookings: 0 }) }));
  }, [visaVsBooking, months, multiYear]);

  const bookingsInRange = dataForLineChart.reduce((a, b) => a + b.bookings, 0);
  const enquiriesInRange = dataForBarChart.reduce((a, b) => a + b.visa + b.bookings, 0);

  if (!permissions.includes("dashboard")) return <div>You are not authorized for Dashboard</div>;

  // Headline numbers: prefer the richer overview, fall back to the original summary.
  // Package bookings = website holiday bookings + customized tour bookings
  // (same as the original "Total Bookings" card).
  const totalBookings = hasOverview
    ? sum(ov.holidayBookingsTotal, ov.customTourBookingsTotal)
    : allCounts?.bookingCount == null && allCounts?.customizedTourBookingCount == null
      ? undefined
      : (Number(allCounts?.bookingCount) || 0) + (Number(allCounts?.customizedTourBookingCount) || 0);
  const bookingsThisMonth = sum(ov.holidayBookingsThisMonth, ov.customTourBookingsThisMonth);
  const bookingsLastMonth = sum(ov.holidayBookingsLastMonth, ov.customTourBookingsLastMonth);
  const postsThisMonth = sum(ov.blogsThisMonth, ov.newsThisMonth);
  const postsLastMonth = sum(ov.blogsLastMonth, ov.newsLastMonth);

  const attention: { label: string; value: number | null | undefined; href: string; icon: LucideIcon; urgent?: boolean }[] = [
    { label: "Package updates awaiting approval", value: ov.packagesPendingApproval, href: "/admin/holidays", icon: Package },
    { label: "Customized tour updates awaiting approval", value: ov.customTourPackagesPendingApproval, href: "/admin/customized-tour-package", icon: Package },
    { label: "Pending package bookings", value: sum(ov.holidayBookingsPending, ov.customTourBookingsPending), href: "/admin/bookings", icon: CalendarCheck, urgent: true },
    { label: "Pending vehicle bookings", value: ov.vehicleBookingsPending, href: "/admin/vehicle", icon: Car, urgent: true },
    { label: "Draft blogs", value: ov.blogsDraft, href: "/admin/blogs", icon: PenLine },
    { label: "Draft news posts", value: ov.newsDraft, href: "/admin/news", icon: PenLine },
    { label: "Draft vehicles", value: ov.vehiclesDraft, href: "/admin/vehicle", icon: Car },
  ];
  const openItems = attention.filter((a) => typeof a.value === "number" && a.value > 0);

  const lastUpdated = overviewUpdatedAt ? new Date(overviewUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null;
  const refreshing = isSummaryFetching || isOverviewFetching;

  const activityItems = [
    latestActivity?.enquiry && {
      key: "enquiry",
      icon: MessageSquareText,
      tone: "sky" as Tone,
      title: "New enquiry",
      body: (
        <>
          <span className="font-medium text-slate-800">{latestActivity.enquiry.name}</span>
          {latestActivity.enquiry.email && <span className="text-slate-400"> · {latestActivity.enquiry.email}</span>}
        </>
      ),
      quote: latestActivity.enquiry.message,
      date: latestActivity.enquiry.createdAt,
      href: "/admin/enquiry",
    },
    latestActivity?.booking && {
      key: "booking",
      icon: CalendarCheck,
      tone: "emerald" as Tone,
      title: "New booking",
      body: (
        <>
          <span className="font-medium text-slate-800">{latestActivity.booking.user?.name || "A traveller"}</span> booked{" "}
          <span className="font-medium text-slate-800">{latestActivity.booking.packageId?.title || "a package"}</span>
        </>
      ),
      pill: latestActivity.booking.bookingStatus,
      date: latestActivity.booking.createdAt,
      href: "/admin/bookings",
    },
    latestActivity?.news && {
      key: "news",
      icon: Newspaper,
      tone: "rose" as Tone,
      title: "New news post",
      body: <span className="font-medium text-slate-800">{latestActivity.news.title}</span>,
      date: latestActivity.news.createdAt,
      href: "/admin/news",
    },
    latestActivity?.blog && {
      key: "blog",
      icon: FileText,
      tone: "violet" as Tone,
      title: "New blog",
      body: <span className="font-medium text-slate-800">{latestActivity.blog.title}</span>,
      date: latestActivity.blog.createdAt,
      href: "/admin/blogs",
    },
  ].filter(Boolean) as {
    key: string;
    icon: LucideIcon;
    tone: Tone;
    title: string;
    body: React.ReactNode;
    quote?: string;
    pill?: string;
    date?: string;
    href: string;
  }[];

  return (
    <FleetPage className="pb-10">
      <AdminPageHeader
        section="Main"
        icon={LayoutDashboard}
        title="Dashboard"
        description="Packages, bookings, enquiries, content and vehicle rentals at a glance."
        badges={
          <FleetPill className={fleetTone.emerald}>Live</FleetPill>
        }
        actions={
          <>
            {lastUpdated && <span className="text-[11px] text-slate-400">Updated {lastUpdated}</span>}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-3 text-[12px] font-medium"
              onClick={() => {
                refetchSummary();
                refetchOverview();
                refetchActivity();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
          Failed to fetch dashboard summary: {error?.message}
        </div>
      )}

      {/* Headline KPIs */}
      {isLoading ? (
        <Loader size="md" message="Loading Summary..." />
      ) : (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeroKpi
            label="Live packages"
            value={fmt(ov.packagesPublished)}
            icon={Package}
            tone="orange"
            href="/admin/holidays"
            hint={typeof ov.packagesTotal === "number" ? `of ${fmt(ov.packagesTotal)} total` : `${fmt(allCounts?.packageCount)} total`}
          />
          <HeroKpi
            label="Package bookings"
            value={fmt(totalBookings)}
            icon={CalendarCheck}
            tone="emerald"
            href="/admin/bookings"
            current={bookingsThisMonth}
            previous={bookingsLastMonth}
            hint="Holidays + customized tours"
          />
          <HeroKpi
            label="Enquiries"
            value={fmt(ov.enquiriesTotal ?? allCounts?.contactEnquiryCount)}
            icon={MessageSquareText}
            tone="sky"
            href="/admin/enquiry"
            current={ov.enquiriesThisMonth}
            previous={ov.enquiriesLastMonth}
          />
          <HeroKpi
            label="Blogs / News"
            value={`${fmt(ov.blogsPublished ?? allCounts?.blogCount)} / ${fmt(ov.newsPublished ?? allCounts?.newsCount)}`}
            icon={Newspaper}
            tone="violet"
            href="/admin/blogs"
            current={postsThisMonth}
            previous={postsLastMonth}
            hint="Published posts"
          />
          <HeroKpi
            label="Rental vehicles"
            value={fmt(ov.vehiclesPublished)}
            icon={Car}
            tone="amber"
            href="/admin/vehicle"
            hint={typeof ov.vehiclesTotal === "number" ? `live of ${fmt(ov.vehiclesTotal)} listed` : undefined}
          />
          <HeroKpi
            label="Vehicle bookings"
            value={fmt(ov.vehicleBookingsTotal)}
            icon={Car}
            tone="rose"
            href="/admin/vehicle"
            current={ov.vehicleBookingsThisMonth}
            previous={ov.vehicleBookingsLastMonth}
          />
          <HeroKpi
            label="Customized tours"
            value={fmt(ov.customTourPackagesPublished)}
            icon={Sparkles}
            tone="orange"
            href="/admin/customized-tour-package"
            hint={typeof ov.customTourPackagesTotal === "number" ? `live of ${fmt(ov.customTourPackagesTotal)} total` : undefined}
          />
          <HeroKpi
            label="Visa enquiries"
            value={fmt(ov.enquiriesVisa)}
            icon={Plane}
            tone="slate"
            href="/admin/enquiry"
            hint={typeof ov.enquiriesVisa === "number" && typeof ov.enquiriesTotal === "number" ? `${pct(ov.enquiriesVisa, ov.enquiriesTotal)}% of all enquiries` : undefined}
          />
        </section>
      )}

      {/* Needs attention */}
      {hasOverview && (
        <FleetPanel
          title="Needs attention"
          icon={AlertTriangle}
          description={openItems.length ? `${openItems.length} area${openItems.length > 1 ? "s" : ""} waiting on the team` : undefined}
          actions={openItems.length === 0 ? <FleetPill className={fleetTone.emerald}>All clear</FleetPill> : undefined}
        >
          {openItems.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-slate-500">
              <CheckCircle2 size={15} className="text-emerald-500" /> Nothing pending right now. Nice work.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
              {openItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-orange-50/40"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
                      item.urgent ? TONE_ICON.rose : TONE_ICON.amber
                    )}
                  >
                    <item.icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold leading-tight tabular-nums text-slate-900">{fmt(item.value)}</p>
                    <p className="truncate text-[11px] text-slate-500 group-hover:text-slate-700">{item.label}</p>
                  </div>
                  <ArrowRight size={13} className="shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#FE5300]" />
                </Link>
              ))}
            </div>
          )}
        </FleetPanel>
      )}

      {/* Trends */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
            <TrendingUp size={16} className="text-[#FE5300]" /> Trends
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">Last 12 months by default. Pick a range to zoom in.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white pl-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="text-[11px] font-medium text-slate-400">From</span>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-8 w-auto border-0 bg-transparent px-2 text-[12px] text-slate-700 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white pl-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="text-[11px] font-medium text-slate-400">To</span>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-8 w-auto border-0 bg-transparent px-2 text-[12px] text-slate-700 shadow-none focus-visible:ring-0"
            />
          </div>
          {(start || end) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-[12px] text-slate-500 hover:text-[#FE5300]"
              onClick={() => {
                setStart("");
                setEnd("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FleetPanel
          title="Bookings trend"
          icon={BarChart3}
          description="Holiday and customized tour bookings per month."
          actions={!isBookingsLoading && !isBookingsError && <FleetPill className={fleetTone.orange} dot={false}>{fmt(bookingsInRange)} in range</FleetPill>}
          bodyClassName="px-2 pb-3 pt-4"
        >
          {isBookingsError ? (
            <PanelError message={`Failed to fetch bookings trend: ${bookingsError?.message ?? ""}`} />
          ) : isBookingsLoading ? (
            <PanelLoading />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataForLineChart} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashBookingsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FE5300" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#FE5300" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: "#fed7aa", strokeWidth: 1 }} />
                  <Area
                    type="monotoneX"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="#FE5300"
                    strokeWidth={2.5}
                    fill="url(#dashBookingsFill)"
                    dot={{ r: 2.5, fill: "#FE5300", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#FE5300", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </FleetPanel>

        <FleetPanel
          title="Visa vs booking enquiries"
          icon={Plane}
          description="Enquiry mix per month, by type."
          actions={!isVisaVsBookingLoading && !isVisaVsBookingError && <FleetPill className={fleetTone.violet} dot={false}>{fmt(enquiriesInRange)} in range</FleetPill>}
          bodyClassName="px-2 pb-3 pt-4"
        >
          {isVisaVsBookingError ? (
            <PanelError message={`Failed to fetch enquiries: ${visaVsBookingError?.message ?? ""}`} />
          ) : isVisaVsBookingLoading ? (
            <PanelLoading />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataForBarChart} margin={{ top: 10, right: 16, left: -16, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="bookings" fill="#FE5300" name="Booking enquiries" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="visa" fill="#8b5cf6" name="Visa enquiries" radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </FleetPanel>
      </div>

      {/* Breakdowns */}
      {hasOverview && (
        <>
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
              <Sparkles size={16} className="text-[#FE5300]" /> Business breakdown
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">Where packages, bookings, enquiries, content and rentals stand today.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <BreakdownPanel
              title="Package catalog"
              icon={Package}
              href="/admin/holidays"
              headline={fmt(ov.packagesTotal)}
              headlineLabel="holiday packages"
            >
              <StatRow label="Published" value={ov.packagesPublished} total={ov.packagesTotal} tone="emerald" href="/admin/holidays" />
              <StatRow label="Draft" value={ov.packagesDraft} total={ov.packagesTotal} tone="slate" href="/admin/holidays" />
              <StatRow label="Updates awaiting approval" value={ov.packagesPendingApproval} total={ov.packagesTotal} tone="amber" href="/admin/holidays" />
              <StatRow label="Added this month" value={ov.packagesThisMonth} tone="orange" href="/admin/holidays" />
            </BreakdownPanel>

            <BreakdownPanel
              title="Package bookings"
              icon={CalendarCheck}
              href="/admin/bookings"
              headline={fmt(totalBookings)}
              headlineLabel="holiday + customized tour bookings"
            >
              {(() => {
                const confirmed = sum(ov.holidayBookingsConfirmed, ov.customTourBookingsConfirmed);
                const pending = sum(ov.holidayBookingsPending, ov.customTourBookingsPending);
                const cancelled = sum(ov.holidayBookingsCancelled, ov.customTourBookingsCancelled);
                return (
                  <>
                    <StatRow label="Holiday packages" value={ov.holidayBookingsTotal} total={totalBookings} tone="orange" href="/admin/bookings" />
                    <StatRow label="Customized tours" value={ov.customTourBookingsTotal} total={totalBookings} tone="amber" href="/admin/bookings/customized-bookings" />
                    <StatRow label="Confirmed" value={confirmed} total={totalBookings} tone="emerald" />
                    <StatRow label="Pending" value={pending} total={totalBookings} tone="sky" />
                    <StatRow label="Cancelled" value={cancelled} total={totalBookings} tone="rose" />
                  </>
                );
              })()}
            </BreakdownPanel>

            <BreakdownPanel
              title="Enquiries"
              icon={MessageSquareText}
              href="/admin/enquiry"
              headline={fmt(ov.enquiriesTotal)}
              headlineLabel="enquiries received"
            >
              {(() => {
                const bookingEnquiries =
                  typeof ov.enquiriesTotal === "number" && typeof ov.enquiriesVisa === "number"
                    ? Math.max(0, ov.enquiriesTotal - ov.enquiriesVisa)
                    : undefined;
                return (
                  <>
                    <StatRow label="Booking / general enquiries" value={bookingEnquiries} total={ov.enquiriesTotal} tone="orange" href="/admin/enquiry" />
                    <StatRow label="Visa enquiries" value={ov.enquiriesVisa} total={ov.enquiriesTotal} tone="violet" href="/admin/enquiry" />
                    <StatRow label="This month" value={ov.enquiriesThisMonth} tone="sky" href="/admin/enquiry" />
                  </>
                );
              })()}
            </BreakdownPanel>

            <BreakdownPanel
              title="Customized tours"
              icon={Sparkles}
              href="/admin/customized-tour-package"
              headline={fmt(ov.customTourPackagesTotal)}
              headlineLabel="customized tour packages"
            >
              <StatRow label="Published" value={ov.customTourPackagesPublished} total={ov.customTourPackagesTotal} tone="emerald" href="/admin/customized-tour-package" />
              <StatRow label="Updates awaiting approval" value={ov.customTourPackagesPendingApproval} total={ov.customTourPackagesTotal} tone="amber" href="/admin/customized-tour-package" />
              <StatRow label="Bookings" value={ov.customTourBookingsTotal} tone="orange" href="/admin/bookings/customized-bookings" />
              <StatRow label="Bookings pending" value={ov.customTourBookingsPending} total={ov.customTourBookingsTotal} tone="sky" />
            </BreakdownPanel>

            <BreakdownPanel
              title="Blogs & news"
              icon={Newspaper}
              href="/admin/blogs"
              headline={fmt(sum(ov.blogsPublished, ov.newsPublished))}
              headlineLabel="published posts"
            >
              {(() => {
                const published = sum(ov.blogsPublished, ov.newsPublished);
                return (
                  <>
                    <StatRow label="Blogs published" value={ov.blogsPublished} total={published} tone="violet" href="/admin/blogs" />
                    <StatRow label="News published" value={ov.newsPublished} total={published} tone="rose" href="/admin/news" />
                    <StatRow label="Drafts (blogs + news)" value={sum(ov.blogsDraft, ov.newsDraft)} tone="slate" />
                    <StatRow label="Posted this month" value={postsThisMonth} tone="emerald" />
                  </>
                );
              })()}
            </BreakdownPanel>

            <BreakdownPanel
              title="Vehicle rentals"
              icon={Car}
              href="/admin/vehicle"
              headline={fmt(ov.vehicleBookingsTotal)}
              headlineLabel="rental bookings"
            >
              <StatRow label="Confirmed" value={ov.vehicleBookingsConfirmed} total={ov.vehicleBookingsTotal} tone="emerald" />
              <StatRow label="Pending" value={ov.vehicleBookingsPending} total={ov.vehicleBookingsTotal} tone="amber" />
              <StatRow label="Cancelled" value={ov.vehicleBookingsCancelled} total={ov.vehicleBookingsTotal} tone="rose" />
              <StatRow label="Vehicles live" value={ov.vehiclesPublished} total={ov.vehiclesTotal} tone="orange" href="/admin/vehicle" />
            </BreakdownPanel>
          </div>
        </>
      )}

      {/* Latest activity */}
      <FleetPanel
        title="Latest activity"
        icon={Activity}
        description="The most recent enquiry, booking and posts."
      >
        {isLatestActivityError ? (
          <div className="px-4 py-6 text-[12px] text-rose-600">Failed to fetch activity: {latestActivityError?.message}</div>
        ) : isLatestActivityLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : activityItems.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-[12px] text-slate-500">
            <Mail size={15} className="text-slate-400" /> No recent activity yet.
          </div>
        ) : (
          <ol className="relative px-4 py-2">
            {activityItems.map((item, i) => (
              <li key={item.key} className="relative flex gap-3 py-3">
                {i < activityItems.length - 1 && (
                  <span className="absolute left-4 top-11 bottom-0 w-px bg-slate-100" aria-hidden />
                )}
                <div className={cn("relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset", TONE_ICON[item.tone])}>
                  <item.icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <Link href={item.href} className="text-[13px] font-semibold text-slate-900 transition-colors hover:text-[#FE5300]">
                      {item.title}
                    </Link>
                    <span className="text-[11px] tabular-nums text-slate-400">{formatDate(item.date)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-slate-600">{item.body}</p>
                  {item.quote && (
                    <p className="mt-1.5 line-clamp-2 border-l-2 border-orange-200 pl-2 text-[12px] italic text-slate-500">
                      “{item.quote}”
                    </p>
                  )}
                  {item.pill && (
                    <FleetPill
                      className={cn(
                        "mt-1.5 capitalize",
                        item.pill.toLowerCase() === "confirmed"
                          ? fleetTone.emerald
                          : item.pill.toLowerCase() === "cancelled"
                            ? fleetTone.red
                            : fleetTone.amber
                      )}
                    >
                      {item.pill}
                    </FleetPill>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </FleetPanel>
    </FleetPage>
  );
}

export default AdminDashBoard;
