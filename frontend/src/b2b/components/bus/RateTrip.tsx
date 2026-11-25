"use client";
// "Rate your trip" (Stage 18 B8): once, after the trip, by the buyer. Works on the website (guest link key / customer)
// and in the business area — the caller passes how to load and send.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { stars, type BusReview } from "../../bus";
import { errorMessage } from "../../messages";

export function RateTrip({ pnr, load, send }: { pnr: string; load: () => Promise<{ review: BusReview | null }>; send: (body: { rating: number; text: string | null }) => Promise<unknown> }) {
  const q = useQuery({ queryKey: ["bus-review", pnr], queryFn: load });
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!q.data) return null;
  if (q.data.review)
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm print:hidden">
        <p className="text-amber-500">{stars(q.data.review.rating)}</p>
        {q.data.review.text && <p className="text-slate-700">{q.data.review.text}</p>}
        {q.data.review.reply && <p className="mt-1 text-slate-500">Reply from the bus company: {q.data.review.reply.text}</p>}
      </div>
    );
  async function submit() {
    setBusy(true);
    try {
      await send({ rating, text: text.trim() || null });
      toast.success("Thanks for your review");
      await q.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm print:hidden">
      <p className="font-medium text-slate-800">Rate your trip</p>
      <div className="flex gap-1 text-2xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={n <= rating ? "text-amber-500" : "text-slate-300"}>★</button>)}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} placeholder="How was the bus, the staff, the timing? (optional)" className="w-full rounded-md border border-slate-300 px-2.5 py-1.5" />
      <button type="button" disabled={busy || rating === 0} onClick={submit} className="rounded-md bg-[#FE5300] px-3 py-1.5 font-medium text-white disabled:opacity-50">Send review</button>
    </div>
  );
}
