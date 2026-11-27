"use client";
// The four papers of a bus (RC, permit, insurance, fitness): number, expiry and the uploaded file (PDF / JPG / PNG).
// Upload first (`POST /files?purpose=bus-paper`), then attach with the number and expiry (`PUT /bus/vehicles/:id/papers`).
import { Eye, FileText, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { B2B_API, b2b, b2bUpload } from "../../api";
import { daysUntil, PAPER_KINDS, PAPER_LABEL, type Bus, type PaperKind } from "../../bus";
import { errorMessage } from "../../messages";
import { inputCls } from "../listing/ui";
import { Pill } from "../portal/ui";

function Expiry({ on }: { on: string }) {
  const left = daysUntil(on);
  if (left < 0) return <Pill tone="red">Expired {on}</Pill>;
  if (left <= 30) return <Pill tone="amber">Expires {on} · {left} day{left === 1 ? "" : "s"} left</Pill>;
  return <Pill tone="green">Valid till {on}</Pill>;
}

function PaperForm({ bus, kind, onSaved, onCancel }: { bus: Bus; kind: PaperKind; onSaved: (b: Bus) => void; onCancel: () => void }) {
  const current = bus.papers.find((p) => p.kind === kind);
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState(current?.number ?? "");
  const [expiresOn, setExpiresOn] = useState(current?.expiresOn ?? "");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const stored = await b2bUpload<{ id: string }>("/files?purpose=bus-paper", file);
      onSaved(await b2b<Bus>(`/bus/vehicles/${bus.id}/papers`, { method: "PUT", body: { kind, fileId: stored.id, number, expiresOn, expectedVersion: bus.version } }));
      toast.success(`${PAPER_LABEL[kind]} saved`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="mt-2 grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <label className="text-[12px] font-medium text-slate-700">
        Paper number
        <input required minLength={2} maxLength={40} value={number} onChange={(e) => setNumber(e.target.value)} className={inputCls} />
      </label>
      <label className="text-[12px] font-medium text-slate-700">
        Valid till
        <input required type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={inputCls} />
      </label>
      <label className="text-[12px] font-medium text-slate-700">
        File (PDF, JPG, PNG)
        <input required type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-[12px]" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-1.5 text-[12px]">Cancel</button>
        <button disabled={busy || !file} className="inline-flex items-center gap-1 rounded-md bg-[#FE5300] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Save
        </button>
      </div>
    </form>
  );
}

export function BusPapers({ bus, canManage, canView, onSaved }: { bus: Bus; canManage: boolean; canView: boolean; onSaved: (b: Bus) => void }) {
  const [editing, setEditing] = useState<PaperKind | null>(null);
  async function view(fileId: string) {
    try {
      const link = await b2b<{ token: string }>(`/files/${fileId}/link`, { method: "POST" });
      window.open(`${B2B_API}/files/download?t=${encodeURIComponent(link.token)}`, "_blank", "noopener");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <ul className="divide-y divide-slate-100">
      {PAPER_KINDS.map((kind) => {
        const p = bus.papers.find((x) => x.kind === kind);
        return (
          <li key={kind} className="py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="min-w-[150px] flex-1 text-[13px] font-medium text-slate-800">
                {PAPER_LABEL[kind]}
                {p && <span className="ml-2 font-mono text-[12px] font-normal text-slate-500">{p.number}</span>}
              </span>
              {p ? <Expiry on={p.expiresOn} /> : <Pill tone="amber">Missing</Pill>}
              {p && canView && (
                <button type="button" onClick={() => view(p.fileId)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[12px]"><Eye className="h-3.5 w-3.5" /> View</button>
              )}
              {canManage && editing !== kind && (
                <button type="button" onClick={() => setEditing(kind)} className="rounded-md border border-slate-300 px-2 py-1 text-[12px]">{p ? "Replace" : "Add"}</button>
              )}
            </div>
            {editing === kind && <PaperForm bus={bus} kind={kind} onCancel={() => setEditing(null)} onSaved={(b) => (setEditing(null), onSaved(b))} />}
          </li>
        );
      })}
    </ul>
  );
}
