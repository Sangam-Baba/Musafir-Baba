"use client";
// Bus reviews (MusafirBaba staff, Stage 18 B8): newest first; hide a review (with a note — e.g. personal details,
// abuse) or show it again. Hidden reviews don't count in a company's rating.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { stars, type BusReview } from "../../bus";
import { errorMessage } from "../../messages";
import { adminCall } from "./AdminPassGate";
import { fleetSelectClass, Notice, SecondaryBtn } from "./kit";

export function BusReviewsAdmin({ token }: { token: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | "PUBLISHED" | "HIDDEN">("");
  const list = useQuery({ queryKey: ["b2b-admin", "bus-reviews", status], queryFn: () => adminCall<{ data: BusReview[] }>(`/admin/bus/reviews${status ? `?status=${status}` : ""}`, token) });
  async function moderate(r: BusReview) {
    const note = r.status === "PUBLISHED" ? window.prompt("Why hide this review?") : null;
    if (r.status === "PUBLISHED" && !note) return;
    try {
      await adminCall(`/admin/bus/reviews/${r.id}/moderate`, token, { method: "POST", body: { visible: r.status !== "PUBLISHED", note } });
      qc.invalidateQueries({ queryKey: ["b2b-admin", "bus-reviews"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="space-y-3 text-[13px]">
      <select aria-label="Status" className={fleetSelectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="">All</option><option value="PUBLISHED">Shown</option><option value="HIDDEN">Hidden</option></select>
      {list.isError && <Notice tone="red">{errorMessage(list.error)}</Notice>}
      {(list.data?.data ?? []).map((r) => (
        <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <p><span className="text-amber-500">{stars(r.rating)}</span> <b>{r.authorName}</b> · {r.routeName} · {r.bookingRef} · company {r.operatorOrgId}</p>
          {r.text && <p className="text-slate-700">{r.text}</p>}
          {r.moderation?.note && <p className="text-slate-500">Note: {r.moderation.note}</p>}
          <div className="mt-2"><SecondaryBtn danger={r.status === "PUBLISHED"} onClick={() => moderate(r)}>{r.status === "PUBLISHED" ? "Hide" : "Show again"}</SecondaryBtn></div>
        </div>
      ))}
      {list.data && list.data.data.length === 0 && <p className="text-slate-500">No reviews.</p>}
    </div>
  );
}
