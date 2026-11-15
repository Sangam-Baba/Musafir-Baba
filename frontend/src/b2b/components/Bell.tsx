"use client";
// The bell in the business area: unread count, the list (newest first), live updates with a short pop-up,
// and a connection dot. What is shown always comes from the API (permissions applied there); a live push
// only says "something new". Without the live connection it checks every minute.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell as BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { b2b, refreshBusinessSession } from "../api";
import { errorMessage } from "../messages";
import { STATUS_LABEL, useRealtime } from "../realtime";
import { useBusinessSession } from "../session-store";

interface Notification {
  id: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  critical: boolean;
  createdAt: string;
  read: boolean;
}

const KEY = ["b2b", "notifications"];

export function Bell({ orgId }: { orgId: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useBusinessSession((s) => s.accessToken);
  const viewing = useBusinessSession((s) => s.viewAs);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const status = useRealtime({
    enabled: Boolean(token),
    getToken: async (expired) => (expired ? (viewing ? null : refreshBusinessSession()) : useBusinessSession.getState().accessToken),
    onMessage: (m) => {
      if (m.event !== "notification:new") return;
      void refresh();
      const title = typeof m.data?.title === "string" ? m.data.title : "New notification";
      toast(title, { action: { label: "Open", onClick: () => setOpen(true) } });
    },
    onSync: () => void refresh(),
  });
  const polling = status !== "live" ? 60_000 : false;
  const count = useQuery({ queryKey: [...KEY, "count", orgId, token], queryFn: () => b2b<{ count: number }>("/notifications/unread-count"), enabled: Boolean(token), refetchInterval: polling });
  const list = useQuery({ queryKey: [...KEY, "list", orgId, token], queryFn: () => b2b<{ data: Notification[] }>("/notifications?limit=30"), enabled: Boolean(token) && open });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function openItem(n: Notification) {
    if (!n.read && !viewing) await b2b(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => undefined);
    void refresh();
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function readAll() {
    try {
      await b2b("/notifications/read-all", { method: "POST" });
      void refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const unread = count.data?.count ?? 0;
  const s = STATUS_LABEL[status];
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100">
        <BellIcon className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[#FE5300] px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
        <span title={s.text} className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-white ${s.dot}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 && !viewing && (
              <button onClick={readAll} className="text-xs text-[#FE5300] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            ) : (list.data?.data ?? []).length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing yet.</p>
            ) : (
              list.data?.data.map((n) => (
                <button key={n.id} onClick={() => openItem(n)} className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-orange-50/40"}`}>
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#FE5300]" />}
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
          <p className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.text}
          </p>
        </div>
      )}
    </div>
  );
}
