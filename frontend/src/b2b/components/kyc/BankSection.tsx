"use client";
// The payout bank account. The full number is stored encrypted; only its last 4 digits are ever shown.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { fieldErrors, type KycApplication } from "../../kyc";
import { errorMessage } from "../../messages";
import { inputClass, Panel, SmallButton } from "../team/ui";

export function BankSection({ app, canEdit, onSaved }: { app: KycApplication; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(!app.bank && canEdit);
  const [form, setForm] = useState({ holderName: app.bank?.holderName ?? "", accountNumber: "", ifsc: app.bank?.ifsc ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await b2b("/kyc/bank", { method: "PUT", body: form });
      toast.success("Bank account saved");
      setForm({ ...form, accountNumber: "" });
      setEditing(false);
      onSaved();
    } catch (err) {
      if (err instanceof B2BError) setErrors(fieldErrors(err.details));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const action = canEdit && app.bank && !editing ? <SmallButton onClick={() => setEditing(true)}>Change</SmallButton> : undefined;
  return (
    <Panel title="2. Bank account for payouts" action={action}>
      {editing ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <Input label="Account holder" value={form.holderName} error={errors.holderName} onChange={(v) => setForm({ ...form, holderName: v })} />
          <Input label="Account number" value={form.accountNumber} error={errors.accountNumber} onChange={(v) => setForm({ ...form, accountNumber: v })} numeric />
          <Input label="IFSC" value={form.ifsc} error={errors.ifsc} onChange={(v) => setForm({ ...form, ifsc: v })} />
          <div className="flex gap-2 sm:col-span-3">
            <SmallButton tone="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save bank account"}
            </SmallButton>
            {app.bank && (
              <SmallButton type="button" onClick={() => setEditing(false)}>
                Cancel
              </SmallButton>
            )}
          </div>
          <p className="text-xs text-slate-500 sm:col-span-3">Upload a cancelled cheque of this account in the documents below.</p>
        </form>
      ) : app.bank ? (
        <p className="text-[13px] text-slate-700">
          {app.bank.holderName} · account ending {app.bank.accountLast4} · IFSC {app.bank.ifsc}
        </p>
      ) : (
        <p className="text-[13px] text-slate-500">No bank account yet.</p>
      )}
    </Panel>
  );
}

function Input({ label, value, error, onChange, numeric }: { label: string; value: string; error?: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <label className="block text-[13px]">
      <span className="font-medium text-slate-700">{label}</span>
      <input className={`${inputClass} mt-1 w-full`} value={value} onChange={(e) => onChange(e.target.value)} inputMode={numeric ? "numeric" : undefined} required autoComplete="off" />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
