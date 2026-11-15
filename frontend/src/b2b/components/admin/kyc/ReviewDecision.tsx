"use client";
// The decision: approve when every required document is verified (high risk: first approval, then a
// different reviewer with the approve permission), or reject with a note the hotel will see.
import { useState } from "react";
import { toast } from "sonner";

import type { ReviewDetail } from "../../../admin-kyc";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, Notice, PrimaryBtn, SecondaryBtn } from "../kit";

export function ReviewDecision({ app, token, onChanged }: { app: ReviewDetail; token: string; onChanged: (d: ReviewDetail) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const first = app.review.firstApproval;
  const label = (key: string) => app.documentSet.find((d) => d.key === key)?.label ?? key;
  const approveText = app.risk.highRisk && !first ? "Give first approval" : first ? "Give final approval" : "Approve";

  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    try {
      const d = await adminCall<ReviewDetail>(`/admin/kyc-applications/${app.id}/decision`, token, { method: "POST", body: { decision, note: note.trim() || null } });
      toast.success(d.status === "APPROVED" ? "Approved — the hotel becomes active" : d.status === "REJECTED" ? "Sent back to the hotel" : "First approval recorded — a second reviewer gives the final approval");
      setNote("");
      onChanged(d);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FleetPanel title="Decision" bodyClassName="space-y-3 p-4">
      {app.risk.highRisk && (
        <Notice>
          High risk: two different people must approve.{" "}
          {first ? `First approval by ${first.by} on ${new Date(first.at).toLocaleString()}${first.note ? ` — “${first.note}”` : ""}.` : ""}
        </Notice>
      )}
      {first && !app.you.canSecondApprove && <Notice tone="red">The final approval needs the “second approval” permission.</Notice>}
      {app.notVerified.length > 0 && <p className="text-[12px] text-slate-600">Still to verify: {app.notVerified.map(label).join(", ")}.</p>}
      <textarea
        className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-orange-300"
        placeholder="Note (required to reject — the hotel sees it)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
      />
      <div className="flex flex-wrap gap-2">
        <PrimaryBtn disabled={busy || app.notVerified.length > 0} onClick={() => decide("APPROVE")}>
          {approveText}
        </PrimaryBtn>
        <SecondaryBtn danger disabled={busy || !note.trim()} onClick={() => decide("REJECT")}>
          Send back for changes
        </SecondaryBtn>
      </div>
    </FleetPanel>
  );
}
