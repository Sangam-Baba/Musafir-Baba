"use client";
// Where the listing stands: status, what still stops a submit, submit / withdraw, MusafirBaba's comments,
// pending changes on a live listing (take them back), and the timeline.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { BLOCKER_TEXT, SECTION_LABEL, STATUS, type Property, type Section } from "../../listing";
import { errorMessage } from "../../messages";

const HISTORY: Record<string, string> = {
  submit: "Submitted for approval",
  resubmit: "Submitted again",
  withdraw: "Withdrawn to draft",
  approve: "Approved — live",
  requestChanges: "Changes requested",
  suspend: "Suspended",
  reactivate: "Live again",
  archive: "Archived",
  "revision-approved": "Changes approved",
  "revision-rejected": "Changes not approved",
  "revision-withdrawn": "Pending changes withdrawn",
};

export function StatusPanel({ property, canManage, onChanged }: { property: Property; canManage: boolean; onChanged: (p: Property) => void }) {
  const [busy, setBusy] = useState(false);
  const status = STATUS[property.status];
  const editable = property.status === "DRAFT" || property.status === "CHANGES_REQUESTED";
  const readiness = useQuery({
    queryKey: ["b2b", "listing-readiness", property.id, property.version],
    queryFn: () => b2b<{ ready: boolean; blockers: { code: string; detail?: string }[] }>(`/hotel/properties/${property.id}/readiness`),
    enabled: editable,
  });

  async function act(path: "submit" | "withdraw" | "revision", method: "POST" | "DELETE" = "POST") {
    setBusy(true);
    try {
      const p = await b2b<Property>(`/hotel/properties/${property.id}/${path}`, { method, body: method === "POST" ? {} : undefined, headers: { "If-Match": `"${property.version}"` } });
      toast.success(path === "submit" ? "Submitted — MusafirBaba will review it" : path === "withdraw" ? "Back to draft" : "Pending changes withdrawn");
      onChanged(p);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const blockers = readiness.data?.blockers ?? [];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[13px] font-medium ${status.tone}`}>{status.label}</span>
          <span className="text-[13px] text-slate-500">{property.publicRef}</span>
          <span className="flex-1" />
          {canManage && editable && (
            <button disabled={busy || !readiness.data?.ready} onClick={() => act("submit")} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">
              {property.status === "CHANGES_REQUESTED" ? "Submit again" : "Submit for approval"}
            </button>
          )}
          {canManage && property.status === "SUBMITTED" && (
            <button disabled={busy} onClick={() => act("withdraw")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]">
              Withdraw to make changes
            </button>
          )}
        </div>
        <p className="mt-2 text-[13px] text-slate-600">{status.text}</p>
        {editable && blockers.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-amber-800">
            {blockers.map((b, i) => (
              <li key={`${b.code}-${i}`}>{BLOCKER_TEXT[b.code]?.(b.detail) ?? b.code}</li>
            ))}
          </ul>
        )}
        {property.gstinMissing && <p className="mt-2 text-[13px] text-amber-800">Your business has no verified GSTIN for this property&apos;s state yet — add it on the Verification page.</p>}
      </div>

      {property.review && property.status === "CHANGES_REQUESTED" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
          <p className="text-sm font-semibold">MusafirBaba&apos;s comments</p>
          {property.review.note && <p className="mt-1">{property.review.note}</p>}
          <ul className="mt-2 space-y-1">
            {property.review.comments.map((c, i) => (
              <li key={i}>
                <strong>{SECTION_LABEL[c.section as Section] ?? c.section}:</strong> {c.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {property.pendingRevision && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-[13px] text-blue-900">
          <p className="text-sm font-semibold">Changes waiting for MusafirBaba&apos;s approval (your listing stays live with the current details)</p>
          <ul className="mt-2 list-disc pl-5">
            {Object.keys(property.pendingRevision.changes).map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          {canManage && (
            <button disabled={busy} onClick={() => act("revision", "DELETE")} className="mt-3 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium">
              Take these changes back
            </button>
          )}
        </div>
      )}

      {property.history.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4 text-[13px]">
          <summary className="cursor-pointer font-semibold text-slate-900">Timeline</summary>
          <ol className="mt-3 space-y-1.5">
            {[...property.history].reverse().map((h, i) => (
              <li key={i} className="text-slate-600">
                <span className="text-slate-400">{new Date(h.at).toLocaleString()}</span> · {HISTORY[h.action] ?? h.action}
                {h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
