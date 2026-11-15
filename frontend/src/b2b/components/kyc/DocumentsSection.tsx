"use client";
// The document list for this hotel (from configuration: GST registered or not). Files are checked and stored
// encrypted by the server; opening one gives a 60-second download link.
import { useRef, useState } from "react";
import { toast } from "sonner";

import { B2B_API, b2b, b2bUpload } from "../../api";
import { MAX_UPLOAD_BYTES, VERDICT_TEXT, type DocumentRequirement, type KycApplication } from "../../kyc";
import { errorMessage } from "../../messages";
import { Panel, SmallButton } from "../team/ui";

export function DocumentsSection({ app, canEdit, onChanged }: { app: KycApplication; canEdit: boolean; onChanged: () => void }) {
  return (
    <Panel title="3. Documents">
      <p className="mb-4 text-xs text-slate-500">PDF, JPG or PNG, up to 10 MB each. Scans must be clear and show the full page.</p>
      <ul className="divide-y divide-slate-100">
        {app.documentSet.map((doc) => (
          <DocumentRow key={doc.key} doc={doc} app={app} canEdit={canEdit} onChanged={onChanged} />
        ))}
      </ul>
    </Panel>
  );
}

function DocumentRow({ doc, app, canEdit, onChanged }: { doc: DocumentRequirement; app: KycApplication; canEdit: boolean; onChanged: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const attached = app.documents.find((d) => d.key === doc.key);
  const problem = app.rejection?.reasons.find((r) => r.key === doc.key && !r.resolved);

  async function upload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) return toast.error("That file is too large (10 MB at most).");
    setBusy(true);
    try {
      const stored = await b2bUpload<{ id: string }>("/files?purpose=kyc-document", file);
      await b2b(`/kyc/documents/${doc.key}`, { method: "PUT", body: { fileId: stored.id } });
      toast.success(`${doc.label} uploaded`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }

  async function open() {
    if (!attached) return;
    try {
      const link = await b2b<{ token: string }>(`/files/${attached.fileId}/link`, { method: "POST" });
      window.open(`${B2B_API}/files/download?t=${encodeURIComponent(link.token)}`, "_blank", "noopener");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    try {
      await b2b(`/kyc/documents/${doc.key}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium text-slate-800">
          {doc.label} {!doc.required && <span className="text-xs font-normal text-slate-400">(optional)</span>}
        </p>
        <p className={`text-xs ${problem ? "text-amber-700" : attached ? "text-green-700" : "text-slate-500"}`}>
          {problem ? `${VERDICT_TEXT[problem.verdict] ?? problem.verdict}${problem.note ? ` — ${problem.note}` : ""}` : attached ? `Uploaded ${new Date(attached.attachedAt).toLocaleDateString()}` : doc.required ? "Needed" : "Not uploaded"}
        </p>
      </div>
      {attached && <SmallButton onClick={open}>View</SmallButton>}
      {canEdit && (
        <>
          <input ref={picker} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <SmallButton tone={attached ? "default" : "primary"} disabled={busy} onClick={() => picker.current?.click()}>
            {busy ? "Uploading…" : attached ? "Replace" : "Upload"}
          </SmallButton>
          {attached && (
            <SmallButton tone="danger" onClick={remove}>
              Remove
            </SmallButton>
          )}
        </>
      )}
    </li>
  );
}
