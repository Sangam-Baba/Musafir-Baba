"use client";
// Further GSTINs of the same business — one per state where it runs a hotel (same PAN). Each is checked by
// MusafirBaba on its own; adding one later never takes the business offline. A different PAN = a separate business.
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { B2B_API, b2b, b2bUpload } from "../../api";
import { MAX_UPLOAD_BYTES, stateName, type GstRegistration, type KycApplication } from "../../kyc";
import { errorMessage } from "../../messages";
import { inputClass, Panel, SmallButton } from "../team/ui";

const STATUS: Record<GstRegistration["status"], { text: string; cls: string }> = {
  PENDING: { text: "Waiting for review", cls: "bg-blue-50 text-blue-700" },
  VERIFIED: { text: "Verified", cls: "bg-green-50 text-green-700" },
  REJECTED: { text: "Not accepted", cls: "bg-amber-50 text-amber-800" },
};

export function GstRegistrationsSection({ app, canEdit, onChanged }: { app: KycApplication; canEdit: boolean; onChanged: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  if (!app.details?.gstRegistered) return null;

  async function add(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) return toast.error("That file is too large (10 MB at most).");
    setBusy(true);
    try {
      const stored = await b2bUpload<{ id: string }>("/files?purpose=kyc-document", file);
      await b2b("/kyc/gst-registrations", { method: "POST", body: { gstin: gstin.trim(), fileId: stored.id } });
      toast.success("GSTIN added — we'll check it");
      setGstin("");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }

  async function open(fileId: string) {
    try {
      const link = await b2b<{ token: string }>(`/files/${fileId}/link`, { method: "POST" });
      window.open(`${B2B_API}/files/download?t=${encodeURIComponent(link.token)}`, "_blank", "noopener");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove(id: string) {
    try {
      await b2b(`/kyc/gst-registrations/${id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const main = app.details.gstin;
  return (
    <Panel title="GST registrations in other states">
      <p className="mb-3 text-xs text-slate-500">
        Hotels in more than one state? Add the GSTIN for each state (same PAN), with its GST certificate. Each property later uses the GSTIN of its state.
        A hotel company with a <strong>different PAN</strong> is a separate business —{" "}
        <Link href="/business/register" className="text-[#FE5300] hover:underline">
          add it as another business
        </Link>
        .
      </p>
      <ul className="divide-y divide-slate-100 text-sm">
        {main && (
          <li className="flex flex-wrap items-center gap-3 py-2">
            <span className="min-w-40 font-medium text-slate-800">{stateName(main.slice(0, 2))}</span>
            <span className="font-mono text-slate-700">{main}</span>
            <span className="text-xs text-slate-500">main GSTIN (checked with your application)</span>
          </li>
        )}
        {app.gstRegistrations.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="min-w-40 font-medium text-slate-800">{stateName(g.stateCode)}</span>
            <span className="font-mono text-slate-700">{g.gstin}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[g.status].cls}`}>{STATUS[g.status].text}</span>
            {g.note && <span className="text-xs text-slate-500">— {g.note}</span>}
            <span className="flex-1" />
            <SmallButton onClick={() => open(g.fileId)}>Certificate</SmallButton>
            {canEdit && g.status !== "VERIFIED" && (
              <SmallButton tone="danger" onClick={() => remove(g.id)}>
                Remove
              </SmallButton>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input className={`${inputClass} w-64 uppercase`} placeholder="GSTIN for another state" value={gstin} onChange={(e) => setGstin(e.target.value)} maxLength={20} />
          <input ref={picker} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && add(e.target.files[0])} />
          <SmallButton tone="primary" disabled={busy || gstin.trim().length < 15} onClick={() => picker.current?.click()}>
            {busy ? "Adding…" : "Upload its GST certificate and add"}
          </SmallButton>
        </div>
      )}
    </Panel>
  );
}
