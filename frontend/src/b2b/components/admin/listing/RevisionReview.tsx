"use client";
// A live listing's pending changes: current value → proposed value, then approve (they go live) or reject with a note.
import { useState } from "react";
import { toast } from "sonner";

import { REVISION_FIELD, type ListingDetail } from "../../../admin-listing";
import type { Masters, Property } from "../../../listing";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, PrimaryBtn, SecondaryBtn } from "../kit";

function show(field: string, value: unknown, masters: Masters | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "cityId") return masters?.cities.find((c) => c.id === value)?.name ?? String(value);
  if (field === "areaId") return masters?.cities.flatMap((c) => c.areas).find((a) => a.id === value)?.name ?? String(value);
  if (field === "address" && typeof value === "object") return Object.values(value as Record<string, unknown>).filter(Boolean).join(", ");
  return String(value);
}

const current = (p: Property, field: string): unknown => (field === "address" ? p.address : (p as unknown as Record<string, unknown>)[field]);

export function RevisionReview({ detail, masters, token, onDecided }: { detail: ListingDetail; masters: Masters | undefined; token: string; onDecided: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const p = detail.property;
  const rev = p.pendingRevision;
  if (!rev) return null;

  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    try {
      await adminCall(`/admin/properties/${p.id}/revision/decision`, token, { method: "POST", body: { revisionId: rev?.revisionId, decision, note: note.trim() || null } });
      toast.success(decision === "APPROVE" ? "Changes approved — live now" : "Changes rejected");
      setNote("");
      onDecided();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FleetPanel title="Changes waiting for approval" description={`Sent ${new Date(rev.submittedAt).toLocaleString()} — the listing stays live meanwhile.`} bodyClassName="space-y-3 p-4">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase text-slate-500">
            <th className="py-1">Field</th>
            <th>Now</th>
            <th>Proposed</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(rev.changes)
            .filter(([f]) => f !== "location")
            .map(([field, value]) => (
              <tr key={field} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-500">{REVISION_FIELD[field] ?? field}</td>
                <td className="text-slate-700">{show(field, current(p, field), masters)}</td>
                <td className="font-medium text-slate-900">{show(field, value, masters)}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <textarea className="min-h-14 w-full rounded-md border border-slate-200 px-3 py-2 text-[13px]" placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
      <div className="flex gap-2">
        <PrimaryBtn disabled={busy} onClick={() => decide("APPROVE")}>
          Approve changes
        </PrimaryBtn>
        <SecondaryBtn danger disabled={busy || !note.trim()} onClick={() => decide("REJECT")}>
          Reject
        </SecondaryBtn>
      </div>
    </FleetPanel>
  );
}
