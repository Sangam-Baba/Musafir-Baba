"use client";
// Further GSTINs of the business (same PAN, other states): open the certificate, verify or reject each one.
// Not tied to the review lock — a verified business can add a state later and stays verified meanwhile.
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { B2B_API } from "../../../api";
import type { ReviewDetail } from "../../../admin-kyc";
import { stateName } from "../../../kyc";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, FleetPill, fleetTone, Input, inputSm, SecondaryBtn } from "../kit";

const TONE = { PENDING: fleetTone.sky, VERIFIED: fleetTone.emerald, REJECTED: fleetTone.amber } as const;

export function ReviewGstRegistrations({ app, token, onChanged }: { app: ReviewDetail; token: string; onChanged: (d: ReviewDetail) => void }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (app.gstRegistrations.length === 0) return null;
  const pan = app.details?.gstin?.slice(2, 12);

  async function open(fileId: string) {
    try {
      const link = await adminCall<{ token: string }>(`/admin/files/${fileId}/link`, token, { method: "POST", body: { orgId: app.orgId } });
      window.open(`${B2B_API}/files/download?t=${encodeURIComponent(link.token)}`, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function decide(id: string, decision: "VERIFY" | "REJECT") {
    try {
      const note = notes[id]?.trim() || null;
      onChanged(await adminCall<ReviewDetail>(`/admin/kyc-applications/${app.id}/gst-registrations/${id}/decision`, token, { method: "POST", body: { decision, note } }));
      toast.success(decision === "VERIFY" ? "GSTIN verified" : "GSTIN rejected");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <FleetPanel title="GST registrations in other states" description="Same PAN as the main GSTIN — check each certificate." bodyClassName="divide-y divide-slate-100">
      {app.gstRegistrations.map((g) => (
        <div key={g.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="min-w-48 flex-1">
            <p className="text-[13px] font-medium text-slate-900">
              {stateName(g.stateCode)} · <span className="font-mono">{g.gstin}</span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
              <FleetPill className={TONE[g.status]}>{g.status.toLowerCase()}</FleetPill>
              {pan && g.gstin.slice(2, 12) === pan && <span className="text-emerald-700">same PAN as the main GSTIN</span>}
              {g.duplicate && <FleetPill className={fleetTone.red}>Also on another organisation</FleetPill>}
              {g.note && <span>— {g.note}</span>}
            </p>
          </div>
          <SecondaryBtn onClick={() => open(g.fileId)}>
            <ExternalLink className="h-3.5 w-3.5" /> Certificate
          </SecondaryBtn>
          {g.status === "PENDING" && app.you.canReview && (
            <>
              <Input className={`${inputSm} w-44`} placeholder="Note (to reject)" value={notes[g.id] ?? ""} onChange={(e) => setNotes({ ...notes, [g.id]: e.target.value })} maxLength={500} />
              <SecondaryBtn onClick={() => decide(g.id, "VERIFY")}>Verify</SecondaryBtn>
              <SecondaryBtn danger disabled={!notes[g.id]?.trim()} onClick={() => decide(g.id, "REJECT")}>
                Reject
              </SecondaryBtn>
            </>
          )}
        </div>
      ))}
    </FleetPanel>
  );
}
