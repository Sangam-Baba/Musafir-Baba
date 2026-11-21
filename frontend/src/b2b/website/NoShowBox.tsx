"use client";
// A no-show the hotel reported (Stage 09): what it costs and, for 72 hours, a way to say "we did stay".
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../messages";
import { bookingNoShow, disputeNoShow } from "./checkout";
import { inr } from "./hotels";

export function NoShowBox({ bookingRef, linkKey }: { bookingRef: string; linkKey: string | null }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["no-show", bookingRef], queryFn: () => bookingNoShow(bookingRef, linkKey) });
  const [message, setMessage] = useState("");
  const n = q.data?.noShow;
  if (!n) return null;
  const open = n.status === "DISPUTE_WINDOW" && Date.now() < Date.parse(n.disputeUntil);
  async function send() {
    try {
      await disputeNoShow(bookingRef, linkKey, message.trim());
      toast.success("Thanks — our team will look into it and reply by email");
      void queryClient.invalidateQueries({ queryKey: ["no-show", bookingRef] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">The hotel reported that nobody checked in.</p>
      <p>No-show charge {inr(n.chargePaise)}{n.refundPaise > 0 ? `, refund ${inr(n.refundPaise)}` : ""}.</p>
      {open && (
        <>
          <p>Did you stay, or is this wrong? Tell us before {new Date(n.disputeUntil).toLocaleString("en-IN")}.</p>
          <textarea className="block h-20 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm" placeholder="What happened (e.g. we checked in late, room number)" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} />
          <button disabled={message.trim().length < 2} onClick={send} className="rounded-lg bg-[#FE5300] px-3 py-1.5 font-semibold text-white disabled:opacity-50">Dispute this no-show</button>
        </>
      )}
      {n.status === "DISPUTED" && <p>You disputed this — our team is checking with the hotel.</p>}
      {n.status === "REVERSED" && <p className="text-emerald-700">Our team agreed with you: the no-show was removed.</p>}
      {n.status === "FINAL" && n.resolution && <p>Our team checked with the hotel: {n.resolution.note}</p>}
    </div>
  );
}
