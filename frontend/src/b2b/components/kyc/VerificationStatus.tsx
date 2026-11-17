"use client";
// Top of the Verification page (inspired by the approved screens): a status banner, the timeline from the real
// history, and — after a rejection — what to fix. Nothing here changes data.
import { Check, Clock, Mail, ShieldAlert, ShieldCheck, X } from "lucide-react";
import Link from "next/link";

import { VERDICT_TEXT, type KycApplication } from "../../kyc";
import { SUPPORT } from "../../support";

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null);

function lastAt(app: KycApplication, actions: string[]) {
  return [...app.history].reverse().find((h) => actions.includes(h.action))?.at ?? null;
}

type Step = { label: string; done: boolean; date: string | null; problem?: boolean };

function stepsOf(app: KycApplication, orgActive: boolean): Step[] {
  const s = app.status;
  const submitted = s !== "DRAFT";
  const reviewed = s === "UNDER_REVIEW" || s === "APPROVED" || s === "REJECTED";
  const ready = Boolean(app.details && app.bank && app.missingDocuments.length === 0);
  return [
    { label: "Application started", done: true, date: lastAt(app, ["created"]) },
    { label: "Details & documents", done: ready || submitted, date: null },
    { label: "Submitted", done: submitted, date: lastAt(app, ["submit", "resubmit"]) },
    { label: "Under review", done: s === "APPROVED" || s === "REJECTED", date: reviewed ? lastAt(app, ["take"]) : null },
    s === "REJECTED"
      ? { label: "Changes requested", done: false, date: lastAt(app, ["reject"]), problem: true }
      : { label: "Verified", done: s === "APPROVED", date: lastAt(app, ["approve"]) },
    { label: "Account activated", done: orgActive && s === "APPROVED", date: null },
  ];
}

function Timeline({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((x) => !x.done);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Verification timeline</h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((st, i) => {
          const isCurrent = i === current;
          const ring = st.problem ? "bg-amber-500 text-white" : st.done ? "bg-emerald-500 text-white" : isCurrent ? "bg-[#FE5300] text-white" : "border-2 border-slate-300 bg-white text-slate-400";
          return (
            <li key={st.label} className="relative flex flex-col items-center text-center">
              {i < steps.length - 1 && <span className={`absolute left-1/2 top-4 hidden h-0.5 w-full lg:block ${st.done ? "bg-emerald-400" : "bg-slate-200"}`} />}
              <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${ring}`}>
                {st.problem ? <X className="h-4 w-4" /> : st.done ? <Check className="h-4 w-4" /> : isCurrent ? <Clock className="h-4 w-4" /> : null}
              </span>
              <span className={`mt-2 text-sm font-medium ${st.problem ? "text-amber-700" : isCurrent ? "text-[#FE5300]" : "text-slate-800"}`}>{st.label}</span>
              <span className="text-xs text-slate-500">{fmt(st.date) ?? (st.done ? "Done" : isCurrent ? "Current step" : "Upcoming")}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const BANNER = {
  DRAFT: { icon: ShieldCheck, tone: "border-orange-200 bg-orange-50/60", title: "Complete your verification", text: "Add your business details, bank account and documents, then submit them for verification." },
  SUBMITTED: { icon: ShieldCheck, tone: "border-orange-200 bg-orange-50/60", title: "Verification in progress", text: "Your application is waiting for the MusafirBaba verification team." },
  UNDER_REVIEW: { icon: ShieldCheck, tone: "border-orange-200 bg-orange-50/60", title: "Verification in progress", text: "Your documents are being reviewed by the MusafirBaba verification team." },
  APPROVED: { icon: ShieldCheck, tone: "border-emerald-200 bg-emerald-50/60", title: "Your business is verified", text: "You can now list your property on MusafirBaba." },
  REJECTED: { icon: ShieldAlert, tone: "border-amber-200 bg-amber-50/60", title: "Your verification needs changes", text: "Fix what MusafirBaba asked for below, then submit again." },
} as const;

export function VerificationStatus({ app, orgActive }: { app: KycApplication; orgActive: boolean }) {
  const b = BANNER[app.status];
  const waiting = app.status === "SUBMITTED" || app.status === "UNDER_REVIEW";
  const label = (key: string) => app.documentSet.find((d) => d.key === key)?.label ?? key;
  return (
    <div className="space-y-4">
      <section className={`flex flex-wrap items-center gap-5 rounded-2xl border p-5 ${b.tone}`}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#FE5300] shadow-sm">
          <b.icon className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{b.title}</h2>
          <p className="text-sm text-slate-600">{b.text}</p>
          {app.submittedAt && <p className="mt-1 text-xs text-slate-500">Submitted on {fmt(app.submittedAt)}{app.round > 1 ? ` · round ${app.round}` : ""}</p>}
        </div>
        {waiting && (
          <div className="flex items-center gap-3 border-slate-200 sm:border-l sm:pl-5">
            <Clock className="h-6 w-6 text-[#FE5300]" />
            <span className="text-sm">
              <span className="block font-medium text-slate-900">Expected update</span>
              <span className="text-slate-500">Within 1–2 working days</span>
            </span>
          </div>
        )}
        {app.status === "APPROVED" && (
          <Link href="/business/properties" className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e54b00]">
            List your property →
          </Link>
        )}
        {waiting && (
          <a href={`mailto:${SUPPORT.email}`} className="flex items-center gap-2 rounded-lg border border-[#FE5300] bg-white px-4 py-2 text-sm font-semibold text-[#FE5300]">
            <Mail className="h-4 w-4" /> Contact support
          </a>
        )}
      </section>
      <Timeline steps={stepsOf(app, orgActive)} />
      {app.rejection && (
        <section className="rounded-2xl border border-amber-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">What to fix</h2>
          {app.rejection.note && <p className="mt-1 text-sm text-slate-700">{app.rejection.note}</p>}
          <ul className="mt-3 space-y-2 text-sm">
            {app.rejection.reasons.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800">{label(r.key)}:</span>
                <span className="text-slate-600">
                  {VERDICT_TEXT[r.verdict] ?? r.verdict}
                  {r.note ? ` — ${r.note}` : ""}
                </span>
                {r.resolved && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">new file added</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
