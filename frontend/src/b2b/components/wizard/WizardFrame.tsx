"use client";
// The sign-up wizard's frame (inspired by the approved screens): dark top bar with the logo and the five-step
// stepper, a scenic banner, the progress card on the left and the step's card on the right.
import { Check, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BANNER_IMAGE } from "../portal/ui";

export const WIZARD_STEPS = [
  { title: "Partner Type", hint: "Hotel & property supplier" },
  { title: "Business Details", hint: "Organisation, contact & address" },
  { title: "Services", hint: "Hotels & Resorts" },
  { title: "Documents", hint: "Documents & bank account" },
  { title: "Review & Submit", hint: "Check and send for verification" },
] as const;

function Dot({ n, step }: { n: number; step: number }) {
  if (n < step) return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></span>;
  if (n === step) return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FE5300] text-[13px] font-semibold text-white">{n}</span>;
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-[13px] text-slate-500">{n}</span>;
}

export function WizardFrame({
  step,
  title,
  highlight,
  subtitle,
  canEdit,
  onEdit,
  children,
}: {
  step: number;
  title: string;
  highlight: string;
  subtitle: string;
  /** whether an earlier step can be reopened */
  canEdit: (n: number) => boolean;
  onEdit: (n: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#111d3a]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-3 py-3 sm:px-6">
          <Link href="/business" className="flex items-center gap-3">
            <Image src="/logo-white.svg" alt="MusafirBaba" width={150} height={26} priority />
            <span className="border-l border-white/40 pl-3 text-base font-bold text-white">Business</span>
          </Link>
          <ol className="hidden flex-1 items-center justify-end gap-2 lg:flex">
            {WIZARD_STEPS.map((s, i) => (
              <li key={s.title} className={`flex items-center gap-2 border-b-2 pb-1 text-[13px] ${i + 1 === step ? "border-[#FE5300] text-white" : "border-transparent text-slate-300"}`}>
                <Dot n={i + 1} step={step} />
                {s.title}
                {i < WIZARD_STEPS.length - 1 && <span className="px-1 text-slate-500">›</span>}
              </li>
            ))}
          </ol>
          <p className="text-[13px] text-slate-300 lg:hidden">
            Step {step} of {WIZARD_STEPS.length}
          </p>
        </div>
      </header>
      <section className="relative overflow-hidden bg-[#111d3a]">
        <Image src={BANNER_IMAGE} alt="" fill priority sizes="100vw" className="object-cover object-[center_75%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111d3a] via-[#111d3a]/80 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-3 pb-24 pt-8 sm:px-6">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
            <span className="h-0.5 w-7 bg-[#FE5300]" /> Become a business partner
          </p>
          <h1 className="mt-2 text-xl font-bold text-white sm:text-3xl">
            {title} <span className="text-[#FE5300]">{highlight}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] text-slate-200">{subtitle}</p>
        </div>
      </section>
      <div className="relative mx-auto -mt-16 grid max-w-7xl gap-4 px-3 pb-12 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-4">
          <p className="text-sm hidden font-semibold text-slate-900 lg:block">Your registration progress</p>
          <ol className="flex items-center justify-between lg:mt-4 lg:block lg:space-y-1">
            {WIZARD_STEPS.map((s, i) => {
              const n = i + 1;
              return (
                <li key={s.title} className={`flex items-start gap-3 rounded-lg lg:p-2 ${n === step ? "lg:bg-orange-50" : ""}`}>
                  {n < step && canEdit(n) ? (
                    <button aria-label={`Back to ${s.title}`} onClick={() => onEdit(n)} className="rounded-full">
                      <Dot n={n} step={step} />
                    </button>
                  ) : (
                    <Dot n={n} step={step} />
                  )}
                  <span className="hidden min-w-0 flex-1 lg:block">
                    <span className={`block text-[13px] font-semibold ${n === step ? "text-[#FE5300]" : "text-slate-900"}`}>{s.title}</span>
                    <span className="block text-xs text-slate-500">{s.hint}</span>
                  </span>
                  {n < step && canEdit(n) && (
                    <button aria-label={`Edit ${s.title}`} onClick={() => onEdit(n)} className="hidden p-1 text-slate-400 hover:text-[#FE5300] lg:block">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[13px] font-semibold text-[#FE5300] lg:hidden">
            Step {step} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step - 1]?.title}
          </p>
        </aside>
        <main className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">{children}</main>
      </div>
    </div>
  );
}

/** Back / Continue buttons at the foot of each step. */
export function StepButtons({ onBack, continueLabel, busy, disabled, type = "submit", onContinue }: { onBack?: () => void; continueLabel: string; busy?: boolean; disabled?: boolean; type?: "submit" | "button"; onContinue?: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
      {onBack ? (
        <button type="button" onClick={onBack} className="rounded-lg border border-[#FE5300] px-4 py-2 text-[13px] font-semibold text-[#FE5300] hover:bg-orange-50">
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button type={type} onClick={onContinue} disabled={busy || disabled} className="rounded-md bg-[#FE5300] px-6 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#e54b00] disabled:opacity-50">
        {busy ? "Please wait…" : `${continueLabel} →`}
      </button>
    </div>
  );
}

/** Icon + title + one line at the top of a step's card. */
export function StepHeading({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5300]">{icon}</span>
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-[13px] text-slate-600">{text}</p>
      </div>
    </div>
  );
}
