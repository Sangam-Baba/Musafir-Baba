"use client";
// Decisions on a listing: approve, request changes (with a comment per section), suspend, reactivate, archive.
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ACTIONS, type AdminAction, type ListingDetail } from "../../../admin-listing";
import { SECTION_LABEL } from "../../../listing";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, fleetSelectClass, Input, inputSm, Notice, PrimaryBtn, SecondaryBtn } from "../kit";

const SECTIONS = Object.keys(SECTION_LABEL) as (keyof typeof SECTION_LABEL)[];

export function ListingDecision({ detail, token, onChanged }: { detail: ListingDetail; token: string; onChanged: (d: ListingDetail) => void }) {
  const status = detail.property.status;
  const [note, setNote] = useState("");
  const [comments, setComments] = useState<{ section: string; note: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const available = (Object.keys(ACTIONS) as AdminAction[]).filter((a) => (ACTIONS[a].from as readonly string[]).includes(status));
  if (available.length === 0) return null;

  async function run(action: AdminAction) {
    if (ACTIONS[action].needs === "reason" && !note.trim()) return toast.error("Write the reason first — the hotel sees it.");
    if (action === "archive" && !window.confirm("Archive this listing? It can't be brought back.")) return;
    setBusy(true);
    try {
      const body = { note: note.trim() || null, ...(action === "requestChanges" ? { comments: comments.filter((c) => c.note.trim()) } : {}) };
      onChanged(await adminCall<ListingDetail>(`/admin/properties/${detail.property.id}/${ACTIONS[action].path}`, token, { method: "POST", body }));
      toast.success(`${ACTIONS[action].label} — done`);
      setNote("");
      setComments([]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FleetPanel title="Decision" bodyClassName="space-y-3 p-4">
      {status === "SUBMITTED" && detail.checklist.blockers.length > 0 && <Notice>The checklist isn&apos;t complete — consider requesting changes.</Notice>}
      {status === "SUBMITTED" && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-slate-700">Comments per section (for “Request changes”)</p>
          {comments.map((c, i) => (
            <div key={i} className="flex gap-2">
              <select className={fleetSelectClass} value={c.section} onChange={(e) => setComments(comments.map((x, j) => (j === i ? { ...x, section: e.target.value } : x)))}>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SECTION_LABEL[s]}
                  </option>
                ))}
              </select>
              <Input className={`${inputSm} flex-1`} value={c.note} placeholder="What to fix" onChange={(e) => setComments(comments.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} maxLength={1000} />
              <SecondaryBtn onClick={() => setComments(comments.filter((_, j) => j !== i))}>
                <X className="h-3.5 w-3.5" />
              </SecondaryBtn>
            </div>
          ))}
          <SecondaryBtn onClick={() => setComments([...comments, { section: "photos", note: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Add comment
          </SecondaryBtn>
        </div>
      )}
      <textarea
        className="min-h-16 w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-orange-300"
        placeholder="Note / reason (required to suspend or archive — the hotel sees it)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
      />
      <div className="flex flex-wrap gap-2">
        {available.map((a) =>
          a === "approve" || a === "reactivate" ? (
            <PrimaryBtn key={a} disabled={busy} onClick={() => run(a)}>
              {ACTIONS[a].label}
            </PrimaryBtn>
          ) : (
            <SecondaryBtn key={a} danger={a !== "requestChanges"} disabled={busy || (a === "requestChanges" && !comments.some((c) => c.note.trim()) && !note.trim())} onClick={() => run(a)}>
              {ACTIONS[a].label}
            </SecondaryBtn>
          ),
        )}
      </div>
    </FleetPanel>
  );
}
