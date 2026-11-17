"use client";
// Business details after registration: shown, and editable while the application is a draft or was sent back.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { ENTITY_TYPES, fieldErrors, TERMS_VERSION, type HotelDetailsInput, type KycApplication, type StoredDetails } from "../../kyc";
import { errorMessage } from "../../messages";
import { Panel, SmallButton } from "../team/ui";
import { BusinessDetailsForm, emptyDetails, toRequest } from "./BusinessDetailsForm";

const fromStored = (d: StoredDetails): HotelDetailsInput => ({
  legalName: d.legalName,
  contactName: d.contactName,
  mobile: d.mobile,
  email: d.email,
  gstRegistered: d.gstRegistered,
  gstin: d.gstin ?? "",
  pan: "",
  address: { line1: d.address.line1, line2: d.address.line2 ?? "", city: d.address.city, stateCode: d.address.stateCode, pin: d.address.pin },
  propertyCount: d.propertyCount,
  termsAccepted: true,
  termsVersion: d.termsVersion,
  tradeName: d.tradeName ?? "",
  entityType: d.entityType ?? "",
  yearEstablished: d.yearEstablished ?? null,
  contactDesignation: d.contactDesignation ?? "",
  alternateMobile: d.alternateMobile ?? "",
});

export function DetailsSection({ app, canEdit, onSaved }: { app: KycApplication; canEdit: boolean; onSaved: () => void }) {
  // an empty draft (registration interrupted, or a hotel created by MusafirBaba) starts with the form open
  const [editing, setEditing] = useState(!app.details && canEdit);
  const [value, setValue] = useState<HotelDetailsInput | null>(app.details ? null : emptyDetails());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const d = app.details;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setBusy(true);
    setErrors({});
    try {
      await b2b("/kyc", { method: "PUT", body: { details: toRequest(value, TERMS_VERSION) } });
      toast.success("Details saved");
      setEditing(false);
      onSaved();
    } catch (err) {
      if (err instanceof B2BError) setErrors(fieldErrors(err.details));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const action =
    canEdit && !editing ? (
      <SmallButton onClick={() => (setValue(d ? fromStored(d) : emptyDetails()), setEditing(true))}>{d ? "Edit" : "Fill in"}</SmallButton>
    ) : undefined;
  return (
    <Panel title="1. Business details" action={action}>
      {editing && value ? (
        <form onSubmit={save} className="space-y-4">
          <BusinessDetailsForm value={value} onChange={setValue} errors={errors} panHint={d ? `On file: ••••••${d.panLast4}. Type the PAN again to save changes.` : undefined} />
          <div className="flex gap-2">
            <SmallButton tone="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </SmallButton>
            {d && (
              <SmallButton type="button" onClick={() => setEditing(false)}>
                Cancel
              </SmallButton>
            )}
          </div>
        </form>
      ) : !d ? (
        <p className="text-sm text-slate-500">Not filled in yet.</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Legal name" v={d.legalName} />
          <Row k="Contact" v={`${d.contactName} · ${d.mobile}`} />
          <Row k="Email" v={d.email} />
          <Row k="GST" v={d.gstRegistered ? (d.gstin ?? "") : "Not registered (below threshold)"} />
          <Row k="PAN" v={`••••••${d.panLast4}`} />
          <Row k="Address" v={[d.address.line1, d.address.line2, d.address.city, d.address.pin].filter(Boolean).join(", ")} />
          <Row k="Properties" v={String(d.propertyCount)} />
          {d.tradeName && <Row k="Trade / brand name" v={d.tradeName} />}
          {d.entityType && <Row k="Entity type" v={ENTITY_TYPES[d.entityType] ?? d.entityType} />}
          {d.yearEstablished && <Row k="Established" v={String(d.yearEstablished)} />}
          {d.contactDesignation && <Row k="Contact designation" v={d.contactDesignation} />}
          {d.alternateMobile && <Row k="Alternate number" v={d.alternateMobile} />}
        </dl>
      )}
    </Panel>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{k}</dt>
      <dd className="text-slate-800">{v}</dd>
    </div>
  );
}
