"use client";
// Where the application stands: status, MusafirBaba's notes after a rejection, and the timeline.
import { HISTORY_TEXT, STATUS_TEXT, VERDICT_TEXT, type KycApplication } from "../../kyc";

export function StatusPanel({ app }: { app: KycApplication }) {
  const status = STATUS_TEXT[app.status];
  const label = (key: string) => app.documentSet.find((d) => d.key === key)?.label ?? key;
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-5 ${status.tone}`}>
        <p className="text-xs uppercase tracking-wide opacity-75">Verification status</p>
        <p className="mt-1 text-lg font-semibold">{status.label}</p>
        <p className="mt-1 text-sm">{status.text}</p>
      </div>
      {app.rejection && (
        <div className="rounded-xl border border-amber-200 bg-white p-5">
          <p className="font-semibold text-slate-900">What to fix</p>
          {app.rejection.note && <p className="mt-1 text-sm text-slate-700">{app.rejection.note}</p>}
          <ul className="mt-3 space-y-2 text-sm">
            {app.rejection.reasons.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800">{label(r.key)}:</span>
                <span className="text-slate-600">
                  {VERDICT_TEXT[r.verdict] ?? r.verdict}
                  {r.note ? ` — ${r.note}` : ""}
                </span>
                {r.resolved && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">new file added</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-900">Timeline</summary>
        <ol className="mt-3 space-y-2">
          {[...app.history].reverse().map((h, i) => (
            <li key={`${h.at}-${i}`} className="flex flex-wrap gap-2 text-slate-600">
              <span className="text-slate-400">{new Date(h.at).toLocaleString()}</span>
              <span>{HISTORY_TEXT[h.action] ?? h.action}</span>
              {h.note && <span className="text-slate-500">— {h.note}</span>}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
