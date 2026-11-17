"use client";
// Building blocks of the partner portal look (inspired by the approved screens, built from what works today):
// page banner with breadcrumb, summary cards, panels with an icon title, and tabs.
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const BANNER_IMAGE = "/Heroimg.jpg";

/** Top of each page: breadcrumb, a title with one word in orange, a short line; the scenic photo fades in on the right. */
export function PageHeader({ crumb, title, highlight, subtitle, actions }: { crumb?: string; title: string; highlight?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 sm:block">
        <Image src={BANNER_IMAGE} alt="" fill priority sizes="50vw" className="object-cover object-[center_75%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-white/0" />
      </div>
      <div className="relative flex flex-wrap items-end gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-500">
            <Link href="/business" className="hover:text-[#FE5300]">
              Business
            </Link>
            {crumb && <span className="text-slate-400"> / {crumb}</span>}
          </p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {title} {highlight && <span className="text-[#FE5300]">{highlight}</span>}
          </h1>
          {subtitle && <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">{subtitle}</p>}
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
    <div className={`flex h-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition ${href ? "hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(16,24,40,0.06)]" : ""}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** A white panel with an icon and a title. */
export function Panel({ icon: Icon, title, subtitle, action, children, tone = "orange", className = "" }: { icon?: LucideIcon; title: string; subtitle?: string; action?: ReactNode; children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      <header className="flex min-h-12 flex-wrap items-center gap-2.5 border-b border-slate-100 px-4 py-2">
        {Icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONES[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Underlined tabs (orange for the open one). */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition ${value === t.value ? "border-[#FE5300] font-medium text-slate-900" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"}`}
        >
          {t.icon && <t.icon className={`h-4 w-4 ${value === t.value ? "text-[#FE5300]" : ""}`} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** A small coloured status label. */
export function Pill({ tone = "orange", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>{children}</span>;
}
