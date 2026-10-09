import React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared presentational pieces for the Fleet Management admin pages, so every
// section gets the same compact header, KPI strip, panels and pills (matching
// the Partner Verification hub). No data logic lives here.

export function FleetPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // flex gap (not space-y) so fixed overlays rendered inside a page never pick up margins
  return <div className={cn("mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5", className)}>{children}</div>;
}

export function FleetPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  badges,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <span>Fleet Management</span>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-slate-700">{title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            <Icon size={18} className="text-[#FE5300]" />
            {title}
          </h1>
          {badges}
        </div>
        {description && <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-500",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
} as const;

export type FleetTone = keyof typeof TONES;

export interface FleetKpi {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: FleetTone;
}

// One slim bordered strip of KPIs (2 per row on mobile, all in a row on lg).
export function FleetKpiStrip({ items }: { items: FleetKpi[] }) {
  const lgCols = items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <div className={`grid grid-cols-2 ${lgCols} overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]`}>
      {items.map((kpi, i) => (
        <div
          key={kpi.label}
          className={cn(
            "flex min-w-0 items-center gap-3 border-slate-100 px-4 py-3",
            i % 2 === 1 && "border-l",
            i >= 2 && "border-t lg:border-t-0",
            i >= 1 && "lg:border-l"
          )}
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONES[kpi.tone || "slate"]}`}>
            <kpi.icon size={15} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-slate-500">{kpi.label}</p>
            <p className="truncate text-lg font-semibold leading-tight tabular-nums text-slate-900">{kpi.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Kept for backwards compatibility; renders a single compact KPI tile.
export function FleetStatCard({ label, value, icon: Icon, tone = "slate" }: FleetKpi) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONES[tone]}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-lg font-semibold leading-tight tabular-nums text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// Bordered white panel with an optional compact header row.
export function FleetPanel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
                {Icon && <Icon size={14} className="text-slate-400" />}
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// Soft status pill with a leading dot. `className` carries the tone, e.g.
// fleetTone.emerald.
export function FleetPill({ className = "", children, dot = true }: { className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", className)}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export const fleetTone = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
  slate: "bg-slate-50 text-slate-600 ring-slate-500/20",
} as const;

export function FleetEmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={18} />
      </div>
      <p className="text-[13px] font-medium text-slate-700">{title}</p>
      {hint && <p className="text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
}

// Compact table header cell / button styles shared by the fleet tables.
export const fleetTh = "h-9 text-[11px] font-medium normal-case tracking-normal text-slate-500";
export const fleetBtnSm = "h-7 px-2.5 text-[12px]";

// Native <select> styled to match the compact inputs (keeps plain onChange logic).
export const fleetSelectClass =
  "h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FE5300]";
