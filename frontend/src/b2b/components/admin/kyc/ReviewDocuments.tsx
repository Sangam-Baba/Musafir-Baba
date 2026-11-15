"use client";
// Each document: open it (60-second link, logged) and give a verdict. Verdicts belong to the exact file,
// so a replaced document shows as not checked yet.
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { B2B_API } from "../../../api";
import type { ReviewDetail, Verdict } from "../../../admin-kyc";
import { VERDICT_TEXT } from "../../../kyc";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, FleetPill, fleetTone, Input, inputSm, SecondaryBtn } from "../kit";

const TONE: Record<Verdict, string> = { VERIFIED: fleetTone.emerald, MISMATCH: fleetTone.amber, UNREADABLE: fleetTone.red };

export function ReviewDocuments({ app, token, canAct, onChanged }: { app: ReviewDetail; token: string; canAct: boolean; onChanged: (d: ReviewDetail) => void }) {
  return (
    <FleetPanel title="Documents" description={canAct ? "Open each one and mark it." : "Take the application for review to mark documents."} bodyClassName="divide-y divide-slate-100">
      {app.documentSet.map((doc) => (
        <DocRow key={doc.key} app={app} docKey={doc.key} label={doc.label} required={doc.required} token={token} canAct={canAct} onChanged={onChanged} />
      ))}
    </FleetPanel>
  );
}

function DocRow({ app, docKey, label, required, token, canAct, onChanged }: { app: ReviewDetail; docKey: string; label: string; required: boolean; token: string; canAct: boolean; onChanged: (d: ReviewDetail) => void }) {
  const [note, setNote] = useState("");
  const attached = app.documents.find((d) => d.key === docKey);
  const verdict = attached ? app.review.verdicts.find((v) => v.key === docKey && v.fileId === attached.fileId) : undefined;

  async function open() {
    if (!attached) return;
    try {
      const link = await adminCall<{ token: string }>(`/admin/files/${attached.fileId}/link`, token, { method: "POST", body: { orgId: app.orgId } });
      window.open(`${B2B_API}/files/download?t=${encodeURIComponent(link.token)}`, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function mark(v: Verdict) {
    try {
      onChanged(await adminCall<ReviewDetail>(`/admin/kyc-applications/${app.id}/documents/${docKey}`, token, { method: "PUT", body: { verdict: v, note: note.trim() || null } }));
      setNote("");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="min-w-48 flex-1">
        <p className="text-[13px] font-medium text-slate-900">
          {label} {!required && <span className="text-[11px] font-normal text-slate-400">(optional)</span>}
        </p>
        {verdict ? (
          <p className="mt-0.5">
            <FleetPill className={TONE[verdict.verdict]}>{VERDICT_TEXT[verdict.verdict]}</FleetPill>
            {verdict.note && <span className="ml-2 text-[12px] text-slate-500">{verdict.note}</span>}
          </p>
        ) : (
          <p className="text-[12px] text-slate-500">{attached ? "Not checked yet" : "Not uploaded"}</p>
        )}
      </div>
      {attached && (
        <SecondaryBtn onClick={open}>
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </SecondaryBtn>
      )}
      {attached && canAct && (
        <>
          <Input className={`${inputSm} w-48`} placeholder="Note (for a problem)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <SecondaryBtn onClick={() => mark("VERIFIED")}>Verified</SecondaryBtn>
          <SecondaryBtn onClick={() => mark("MISMATCH")}>Mismatch</SecondaryBtn>
          <SecondaryBtn danger onClick={() => mark("UNREADABLE")}>
            Unreadable
          </SecondaryBtn>
        </>
      )}
    </div>
  );
}
