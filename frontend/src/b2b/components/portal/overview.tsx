"use client";
// Pieces of the Overview page: progress ring, the verification / listing progress card, and the checklist.
import { CheckCircle2, Circle, Clock, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { percentDone, type OnboardingStep } from "../../onboarding";

export function ProgressRing({ percent, label = "Completed" }: { percent: number; label?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#fde7dc" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#FE5300" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-900">{percent}%</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function StepIcon({ step, current }: { step: OnboardingStep; current: boolean }) {
  if (step.done) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (step.waiting) return <Clock className="h-4 w-4 shrink-0 text-sky-500" />;
  return <Circle className={`h-5 w-5 shrink-0 ${current ? "text-[#FE5300]" : "text-slate-300"}`} />;
}

/** The big card: what this stage is, the ring, the next action and the steps. */
export function ProgressCard({ icon: Icon = ShieldCheck, title, text, steps, cta }: { icon?: LucideIcon; title: string; text: string; steps: OnboardingStep[]; cta?: { label: string; href: string } }) {
  const next = steps.find((s) => !s.done);
  return (
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:grid-cols-[1fr_auto_minmax(0,18rem)] lg:items-center">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FE5300]">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-[13px] text-slate-600">{text}</p>
          {cta && (
            <Link href={cta.href} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#e54b00]">
              {cta.label} →
            </Link>
          )}
        </div>
      </div>
      <ProgressRing percent={percentDone(steps)} />
      <ul className="space-y-2 lg:border-l lg:border-slate-100 lg:pl-6">
        {steps.map((s) => (
          <li key={s.key} className={`flex items-center gap-2 text-[13px] ${s === next ? "font-medium text-[#FE5300]" : s.done ? "text-slate-700" : "text-slate-500"}`}>
            <StepIcon step={s} current={s === next} />
            {s.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Checklist with a bar and an action button next to each open step. */
export function Checklist({ title, steps }: { title: string; steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-[13px] text-slate-500">
          {done} of {steps.length} completed
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#FE5300]" style={{ width: `${percentDone(steps)}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-3 py-2 text-[13px]">
            <StepIcon step={s} current={false} />
            <span className={`flex-1 ${s.done ? "text-slate-700" : "text-slate-900"}`}>{s.label}</span>
            {s.waiting && <span className="text-xs text-sky-600">With MusafirBaba</span>}
            {!s.done && !s.waiting && s.href && s.action && (
              <Link href={s.href} className="rounded-md border border-[#FE5300] px-3 py-1 text-xs font-medium text-[#FE5300] hover:bg-orange-50">
                {s.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
