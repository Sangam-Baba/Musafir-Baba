"use client";
// Reviews of the company's trips (Stage 18 B8): read them and reply once (the reply can be changed).
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { stars, type BusReview } from "../../bus";
import { errorMessage } from "../../messages";
import { Panel } from "../portal/ui";

export function OperatorReviews({ canReply }: { canReply: boolean }) {
  const q = useQuery({ queryKey: ["b2b", "bus-reviews"], queryFn: () => b2b<{ data: BusReview[] }>("/bus/reviews") });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const items = q.data?.data ?? [];
  const avg = items.filter((r) => r.status === "PUBLISHED").reduce((s, r, _i, a) => s + r.rating / a.length, 0);
  async function reply(id: string) {
    try {
      await b2b(`/bus/reviews/${id}/reply`, { method: "POST", body: { text: drafts[id] ?? "" } });
      toast.success("Reply saved");
      await q.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Panel title="Passenger reviews" subtitle={items.length ? `${avg.toFixed(1)} ★ from ${items.filter((r) => r.status === "PUBLISHED").length} reviews` : "No reviews yet"}>
      <ul className="space-y-2 text-[13px]">
        {items.map((r) => (
          <li key={r.id} className="rounded-md border border-slate-200 p-3">
            <p><span className="text-amber-500">{stars(r.rating)}</span> <b>{r.authorName}</b> · {r.routeName} · {r.tripDate}{r.status === "HIDDEN" ? " · hidden by MusafirBaba" : ""}</p>
            {r.text && <p className="text-slate-700">{r.text}</p>}
            {r.reply && <p className="mt-1 text-slate-500">Your reply: {r.reply.text}</p>}
            {canReply && (
              <div className="mt-2 flex gap-2">
                <input value={drafts[r.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} placeholder={r.reply ? "Change your reply" : "Reply to this passenger"} className="flex-1 rounded-md border border-slate-300 px-2 py-1" />
                <button type="button" disabled={(drafts[r.id] ?? "").trim().length < 2} onClick={() => reply(r.id)} className="rounded-md bg-[#FE5300] px-3 py-1 text-white disabled:opacity-50">Reply</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
