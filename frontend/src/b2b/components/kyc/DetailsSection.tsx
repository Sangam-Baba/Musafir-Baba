"use client";
// Business details after registration: shown, and editable while the application is a draft or was sent back.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { fieldErrors, TERMS_VERSION, type HotelDetailsInput, type KycApplication, type StoredDetails } from "../../kyc";
import { errorMessage } from "../../messages";
import { Panel, SmallButton } from "../team/ui";
import { HotelDetailsFields, toRequest } from "./HotelDetailsFields";

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
});

export function DetailsSection({ app, canEdit, onSaved }: { app: KycApplication; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<HotelDetailsInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const d = app.details;
  if (!d) return null;

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
      <SmallButton onClick={() => (setValue(fromStored(d)), setEditing(true))}>Edit</SmallButton>
    ) : undefined;
  return (
    <Panel title="1. Business details" action={action}>
      {editing && value ? (
        <form onSubmit={save} className="space-y-4">
          <HotelDetailsFields value={value} onChange={setValue} errors={errors} panHint={`On file: ••••••${d.panLast4}. Type the PAN again to save changes.`} />
          <div className="flex gap-2">
            <SmallButton tone="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </SmallButton>
            <SmallButton type="button" onClick={() => setEditing(false)}>
              Cancel
            </SmallButton>
          </div>
        </form>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Legal name" v={d.legalName} />
          <Row k="Contact" v={`${d.contactName} · ${d.mobile}`} />
          <Row k="Email" v={d.email} />
          <Row k="GST" v={d.gstRegistered ? (d.gstin ?? "") : "Not registered (below threshold)"} />
          <Row k="PAN" v={`••••••${d.panLast4}`} />
          <Row k="Address" v={[d.address.line1, d.address.line2, d.address.city, d.address.pin].filter(Boolean).join(", ")} />
          <Row k="Properties" v={String(d.propertyCount)} />
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
