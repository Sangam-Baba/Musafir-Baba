"use client";
// Change requests on a hotel booking (Stage 09): ask MusafirBaba for new dates, other guest names, a better room, about a
// refund, or anything else; follow the answers and reply here (email replies aren't read yet).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../messages";
import { AMENDMENT_TYPES, changeRequests, NAME_RE, openChangeRequest, replyChangeRequest, type AmendmentType, type ChangeRequest } from "./checkout";

const STATUS: Record<ChangeRequest["status"], string> = { OPEN: "Waiting for MusafirBaba", IN_PROGRESS: "Being handled", WAITING_CUSTOMER: "Waiting for your answer", RESOLVED: "Done", CLOSED: "Closed" };

function Thread({ r, bookingRef, linkKey }: { r: ChangeRequest; bookingRef: string; linkKey: string | null }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const open = r.status !== "RESOLVED" && r.status !== "CLOSED";
  async function send() {
    try {
      await replyChangeRequest(bookingRef, linkKey, r.id, text.trim());
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["change-requests", bookingRef] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-2">
      <p className="text-xs text-slate-500">{r.ref} · {AMENDMENT_TYPES[r.type]} · <span className="font-medium text-slate-700">{STATUS[r.status]}</span></p>
      {r.messages.map((m, i) => (
        <p key={i} className={`rounded-lg px-3 py-1.5 text-sm ${m.from === "You" ? "bg-slate-50 text-slate-700" : "bg-orange-50 text-slate-800"}`}><span className="text-xs text-slate-500">{m.from} · {new Date(m.at).toLocaleString("en-IN")}</span><br />{m.text}</p>
      ))}
      {r.resolution && <p className="text-xs text-emerald-700">Outcome: {r.resolution}</p>}
      {open && (
        <div className="flex gap-2">
          <input className="h-9 flex-1 rounded-lg border border-slate-200 px-2 text-sm" placeholder="Write a reply" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
          <button disabled={text.trim().length < 2} onClick={send} className="rounded-lg bg-[#FE5300] px-3 text-sm font-semibold text-white disabled:opacity-50">Send</button>
        </div>
      )}
    </div>
  );
}

export function ChangeRequests({ bookingRef, linkKey, rooms }: { bookingRef: string; linkKey: string | null; rooms: { leadGuest: string }[] }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["change-requests", bookingRef], queryFn: () => changeRequests(bookingRef, linkKey) });
  const [type, setType] = useState<AmendmentType | "">("");
  const [message, setMessage] = useState("");
  const [names, setNames] = useState<string[]>(rooms.map((r) => r.leadGuest));
  const [busy, setBusy] = useState(false);
  const namesOk = type !== "MODIFY_GUESTS" || names.every((n) => NAME_RE.test(n.trim()));
  async function submit() {
    if (!type) return;
    setBusy(true);
    try {
      await openChangeRequest(bookingRef, linkKey, { type, message: message.trim(), ...(type === "MODIFY_GUESTS" ? { guestNames: names.map((n, i) => ({ room: i + 1, leadGuest: n.trim() })) } : {}) });
      toast.success("Request sent — we usually answer within 4 hours");
      setType("");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["change-requests", bookingRef] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="font-semibold text-slate-900">Need a change?</p>
      <div className="flex flex-wrap gap-2">
        <select className="h-9 rounded-lg border border-slate-200 px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as AmendmentType | "")}>
          <option value="">Choose what you need…</option>
          {Object.entries(AMENDMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {type === "MODIFY_GUESTS" && names.map((n, i) => (
        <input key={i} className="block h-9 w-full rounded-lg border border-slate-200 px-2 text-sm" placeholder={`Lead guest, room ${i + 1}`} value={n} maxLength={60} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
      ))}
      {type && (
        <>
          <textarea className="block h-20 w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="Tell us what you need" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} />
          <button disabled={busy || message.trim().length < 2 || !namesOk} onClick={submit} className="rounded-lg bg-[#FE5300] px-3 py-1.5 font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send request"}</button>
        </>
      )}
      {(q.data?.data ?? []).map((r) => <Thread key={r.id} r={r} bookingRef={bookingRef} linkKey={linkKey} />)}
    </div>
  );
}
