"use client";
// Building blocks of the partner portal look (inspired by the approved screens, built from what works today):
// page banner with breadcrumb, summary cards, panels with an icon title, and tabs.
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const BANNER_IMAGE = "/Heroimg.jpg";

/** Banner at the top of each page: breadcrumb, a title with one word in orange, a short line, a scenic photo. */
export function PageHeader({ crumb, title, highlight, subtitle, actions }: { crumb?: string; title: string; highlight?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <Image src={BANNER_IMAGE} alt="" fill priority sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover object-[center_75%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/20" />
      <div className="relative flex flex-wrap items-end gap-4 px-5 py-5 sm:px-8 sm:py-7">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">
            <Link href="/business" className="hover:text-[#FE5300]">
              Business
            </Link>
            {crumb && <span> › {crumb}</span>}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title} {highlight && <span className="text-[#FE5300]">{highlight}</span>}
          </h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </section>
  );
}

const TONES = {
  orange: "bg-orange-50 text-[#FE5300]",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
} as const;
export type Tone = keyof typeof TONES;

/** A number with its label (counts only from real data). */
export function StatCard({ icon: Icon, label, value, hint, tone = "orange", href }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string; tone?: Tone; href?: string }) {
  const body = (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${TONES[tone]}`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
        <p className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** A white panel with an icon and a title. */
export function Panel({ icon: Icon, title, subtitle, action, children, tone = "orange", className = "" }: { icon?: LucideIcon; title: string; subtitle?: string; action?: ReactNode; children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** Underlined tabs (orange for the open one). */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm sm:px-4 ${value === t.value ? "border-[#FE5300] font-medium text-[#FE5300]" : "border-transparent text-slate-600 hover:text-slate-900"}`}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** A small coloured status label. */
export function Pill({ tone = "orange", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
