"use client";
// B2B admin → Privacy (Stage 16, DPDP): data requests from guests and business users — most urgent first (30-day due
// date); staff resolve each with a note of what was done. Needs `platform.privacy.manage`.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, SecondaryBtn } from "./kit";

type Req = { id: string; ref: string; type: string; name: string; email: string; phone: string | null; details: string | null; status: "OPEN" | "DONE" | "REJECTED"; dueAt: string; createdAt: string; resolvedBy: string | null; resolution: string | null };

function Row({ r, token }: { r: Req; token: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  async function resolve(done: boolean) {
    try {
      await adminCall(`/admin/privacy/requests/${r.id}/resolve`, token, { method: "POST", body: { done, note: note.trim() } });
      void qc.invalidateQueries({ queryKey: ["b2b-admin", "privacy"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const late = r.status === "OPEN" && new Date(r.dueAt).getTime() < Date.now();
  return (
    <div className="space-y-1 px-4 py-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <FleetPill className={r.status === "OPEN" ? (late ? fleetTone.red : fleetTone.amber) : fleetTone.emerald}>{r.status === "OPEN" ? (late ? "Overdue" : "Open") : r.status}</FleetPill>
        <span className="font-mono text-[12px]">{r.ref}</span>
        <span className="font-medium">{r.type}</span>
        <span className="text-slate-600">{r.name} · {r.email}{r.phone ? ` · ${r.phone}` : ""}</span>
        <span className="ml-auto text-[11px] text-slate-400">due {new Date(r.dueAt).toLocaleDateString("en-IN")}</span>
      </div>
      {r.details && <p className="text-slate-700">“{r.details}”</p>}
      {r.resolution && <p className="text-[12px] text-slate-500">{r.resolvedBy}: {r.resolution}</p>}
      {r.status === "OPEN" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className={`${inputSm} w-96`} placeholder="What was done (sent the copy / deleted / corrected …)" value={note} onChange={(e) => setNote(e.target.value)} />
          <SecondaryBtn disabled={note.trim().length < 3} onClick={() => void resolve(true)}>Done</SecondaryBtn>
          <SecondaryBtn danger disabled={note.trim().length < 3} onClick={() => void resolve(false)}>Can't do (say why)</SecondaryBtn>
        </div>
      )}
    </div>
  );
}

export function PrivacyTab({ token }: { token: string }) {
  const [status, setStatus] = useState<"OPEN" | "DONE" | "REJECTED">("OPEN");
  const q = useQuery({ queryKey: ["b2b-admin", "privacy", status], queryFn: () => adminCall<{ data: Req[] }>(`/admin/privacy/requests?status=${status}`, token), retry: false });
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel
      title="Data requests (DPDP)"
      description="Copies, corrections, deletions and complaints about personal data — answer within 30 days. Confirm the person's identity before sending data. Public form: /business/privacy"
      icon={ShieldCheck}
      bodyClassName="p-0"
      actions={<div className="flex gap-1.5">{(["OPEN", "DONE", "REJECTED"] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${status === s ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{s}</button>)}</div>}
    >
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={ShieldCheck} title="No requests" />}
      <div className="divide-y divide-slate-100">{rows.map((r) => <Row key={r.id} r={r} token={token} />)}</div>
    </FleetPanel>
  );
}
