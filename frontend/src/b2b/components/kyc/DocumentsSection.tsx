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
    <Panel title="Submitted documents">
      <p className="mb-3 text-xs text-slate-500">PDF, JPG or PNG, up to 10 MB each. Scans must be clear and show the full page.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th className="rounded-l-lg px-3 py-2">Document</th>
              <th className="px-3 py-2">Requirement</th>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2">Status</th>
              <th className="rounded-r-lg px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {app.documentSet.map((doc) => (
              <DocumentRow key={doc.key} doc={doc} app={app} canEdit={canEdit} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** What the hotel sees for one document (reviewers' verdicts are only shown when something needs fixing). */
function statusOf(app: KycApplication, attached: boolean, required: boolean, problem: { verdict: string; note: string | null } | undefined) {
  if (problem) return { label: VERDICT_TEXT[problem.verdict] ?? "Needs a new file", tone: "bg-amber-50 text-amber-700", note: problem.note };
  if (!attached) return required ? { label: "Needed", tone: "bg-red-50 text-red-600", note: null } : { label: "Optional", tone: "bg-slate-100 text-slate-500", note: null };
  if (app.status === "APPROVED") return { label: "Verified", tone: "bg-emerald-50 text-emerald-700", note: null };
  if (app.status === "SUBMITTED" || app.status === "UNDER_REVIEW") return { label: "Under review", tone: "bg-amber-50 text-amber-700", note: null };
  return { label: "Uploaded", tone: "bg-sky-50 text-sky-700", note: null };
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

  const status = statusOf(app, Boolean(attached), doc.required, problem);
  return (
    <tr className="align-middle">
      <td className="px-3 py-3 font-medium text-slate-800">{doc.label}</td>
      <td className="px-3 py-3 text-xs text-slate-500">{doc.required ? "Mandatory" : "Optional"}</td>
      <td className="px-3 py-3 text-xs text-slate-600">{attached ? `Uploaded ${new Date(attached.attachedAt).toLocaleDateString()}` : "—"}</td>
      <td className="px-3 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span>
        {status.note && <span className="mt-1 block text-xs text-slate-500">{status.note}</span>}
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
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
        </div>
      </td>
    </tr>
  );
}
