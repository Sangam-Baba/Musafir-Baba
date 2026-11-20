"use client";
// The typed data a reviewer compares with the documents, with the cross-checks highlighted.
// The full PAN and account number are shown only on request (every view is recorded).
import { CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { namesMatch, RISK_TEXT, type ReviewDetail } from "../../../admin-kyc";
import { ENTITY_TYPES, GST_STATES } from "../../../kyc";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, FleetPill, fleetTone, SecondaryBtn } from "../kit";

const stateName = (code: string) => GST_STATES.find(([c]) => c === code)?.[1] ?? code;

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-[12px] ${ok ? "text-emerald-700" : "text-amber-700"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} {text}
    </p>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-[12px] text-slate-500">{k}</dt>
      <dd className="col-span-2 text-[13px] text-slate-900">{children}</dd>
    </div>
  );
}

export function ReviewFacts({ app, token }: { app: ReviewDetail; token: string }) {
  const [full, setFull] = useState<{ pan: string | null; accountNumber: string | null } | null>(null);
  const d = app.details;
  if (!d) return null;

  async function reveal() {
    try {
      setFull(await adminCall<{ pan: string | null; accountNumber: string | null }>(`/admin/kyc-applications/${app.id}/sensitive`, token, { method: "POST" }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const panInGstin = d.gstin && full?.pan ? d.gstin.slice(2, 12) === full.pan : null;
  return (
    <FleetPanel
      title="Business details"
      description="What the hotel typed — compare with the documents."
      actions={
        app.you.canReview && !full ? (
          <SecondaryBtn onClick={reveal}>
            <Eye className="h-3.5 w-3.5" /> Show full PAN & account
          </SecondaryBtn>
        ) : undefined
      }
      bodyClassName="p-4"
    >
      {app.risk.flags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {app.risk.flags.map((f) => (
            <FleetPill key={f} className={fleetTone.red}>
              {RISK_TEXT[f] ?? f}
            </FleetPill>
          ))}
        </div>
      )}
      <dl>
        <Row k="Legal name">{d.legalName}</Row>
        {d.tradeName && <Row k="Trade / brand name">{d.tradeName}</Row>}
        {(d.entityType || d.yearEstablished) && (
          <Row k="Business type">
            {d.entityType ? ENTITY_TYPES[d.entityType] : "—"}
            {d.yearEstablished ? ` · established ${d.yearEstablished}` : ""}
          </Row>
        )}
        <Row k="Contact">
          {d.contactName}
          {d.contactDesignation ? ` (${d.contactDesignation})` : ""} · {d.mobile}
          {d.alternateMobile ? ` / ${d.alternateMobile}` : ""} · {d.email}
        </Row>
        <Row k="GST">
          {d.gstRegistered ? (
            <>
              <span className="font-mono">{d.gstin}</span>
              <Check ok text={`Checksum valid; state ${stateName(d.gstin?.slice(0, 2) ?? "")} matches the address`} />
            </>
          ) : (
            "Not registered — below-threshold declaration expected"
          )}
        </Row>
        <Row k="PAN">
          <span className="font-mono">{full?.pan ?? `••••••${d.panLast4}`}</span>
          {panInGstin !== null && <Check ok={panInGstin} text={panInGstin ? "Same as the PAN inside the GSTIN" : "Differs from the PAN inside the GSTIN"} />}
        </Row>
        <Row k="Address">
          {[d.address.line1, d.address.line2, d.address.city, stateName(d.address.stateCode), d.address.pin].filter(Boolean).join(", ")}
        </Row>
        {app.orgType !== "CLIENT" && <Row k="Properties">{d.propertyCount}</Row>}
        <Row k="Bank account">
          {app.bank ? (
            <>
              {app.bank.holderName} · <span className="font-mono">{full?.accountNumber ?? `••••${app.bank.accountLast4}`}</span> · IFSC <span className="font-mono">{app.bank.ifsc}</span>
              <Check ok={namesMatch(app.bank.holderName, d.legalName)} text={namesMatch(app.bank.holderName, d.legalName) ? "Holder name matches the legal name" : "Holder name differs from the legal name — check the cheque"} />
            </>
          ) : (
            "Not given"
          )}
        </Row>
      </dl>
    </FleetPanel>
  );
}
