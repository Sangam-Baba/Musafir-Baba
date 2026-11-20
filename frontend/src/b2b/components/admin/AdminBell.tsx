"use client";
// B2B admin bell (MusafirBaba staff): how many verification applications are waiting, updated live when the
// queue changes (`queue:changed` pushes carry only the queue name), with a pop-up for staff on the page.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell as BellIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { age, type QueueItem } from "../../admin-kyc";
import type { ListingItem } from "../../admin-listing";
import { STATUS_LABEL, useRealtime } from "../../realtime";
import { adminCall } from "./AdminPassGate";

export function AdminBell({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const known = useRef<number | null>(null);
  const status = useRealtime({
    getToken: async (expired) => (expired ? null : token), // an expired admin pass is asked for again on the page
    onMessage: (m) => {
      if (m.event !== "queue:changed") return;
      if (m.data?.queue === "kyc") void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "kyc"] });
      if (m.data?.queue === "listings") void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "listings"] });
      if (m.data?.queue === "booking-requests") void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "booking-requests"] }); // the Requests tab refreshes live
    },
    onSync: () => void queryClient.invalidateQueries({ queryKey: ["b2b-admin"] }),
  });
  const waiting = useQuery({
    queryKey: ["b2b-admin", "kyc", "waiting"],
    queryFn: async () => {
      const r = await adminCall<{ data: QueueItem[] }>("/admin/kyc-applications?status=SUBMITTED", token);
      if (known.current !== null && r.data.length > known.current) toast("New verification waiting for review");
      known.current = r.data.length;
      return r;
    },
    refetchInterval: status === "live" ? false : 60_000,
    retry: false,
  });
  const listings = useQuery({
    queryKey: ["b2b-admin", "listings", "bell"],
    queryFn: () => adminCall<{ data: ListingItem[] }>("/admin/properties?queue=true", token),
    refetchInterval: status === "live" ? false : 60_000,
    retry: false,
  });
  const list = waiting.data?.data ?? [];
  const listingList = listings.data?.data ?? [];
  const total = list.length + listingList.length;
  const s = STATUS_LABEL[status];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`${total} waiting for review`} className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
        <BellIcon className="h-4 w-4" />
        {total > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#FE5300] px-1 text-center text-[10px] font-semibold leading-4 text-white">{total}</span>}
        <span title={s.text} className={`absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-3 py-2 text-[13px] font-semibold text-slate-900">Verifications to review</p>
          {list.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-slate-500">Nothing waiting.</p>
          ) : (
            list.slice(0, 8).map((a) => (
              <Link key={a.id} href={`/admin/b2b/kyc/${a.id}`} className="block border-b border-slate-50 px-3 py-2 text-[13px] hover:bg-slate-50" onClick={() => setOpen(false)}>
                <span className="font-medium text-slate-900">{a.legalName ?? "—"}</span>
                <span className="block text-[11px] text-slate-500">
                  waiting {age(a.submittedAt)}
                  {a.risk.highRisk ? " · high risk" : ""}
                </span>
              </Link>
            ))
          )}
          <p className="border-y border-slate-100 px-3 py-2 text-[13px] font-semibold text-slate-900">Listings to review</p>
          {listingList.length === 0 ? (
            <p className="px-3 py-3 text-center text-[12px] text-slate-500">Nothing waiting.</p>
          ) : (
            listingList.slice(0, 8).map((l) => (
              <Link key={l.id} href={`/admin/b2b/properties/${l.id}`} className="block border-b border-slate-50 px-3 py-2 text-[13px] hover:bg-slate-50" onClick={() => setOpen(false)}>
                <span className="font-medium text-slate-900">{l.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {l.hasPendingRevision ? "changes to review" : "new listing"} · waiting {age(l.hasPendingRevision ? l.revisionSubmittedAt : l.submittedAt)}
                </span>
              </Link>
            ))
          )}
          <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.text}
          </p>
        </div>
      )}
    </div>
  );
}
