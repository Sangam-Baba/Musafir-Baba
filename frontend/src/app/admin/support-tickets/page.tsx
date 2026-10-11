"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LifeBuoy, Inbox, Clock3, CheckCircle2, AlertTriangle, Send, Phone, MessageCircle, ImageIcon } from "lucide-react";
import { FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTone, FleetEmptyState, FleetKpiStrip, fleetTh, fleetSelectClass } from "@/components/admin/fleet/FleetUI";

// Help & Support tickets raised by riders in the MBGO app.

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Attachment { url: string }
interface Ticket {
  _id: string;
  ticketId: string;
  riderId?: { fullName?: string; mobileNumber?: string } | null;
  service: string;
  serviceLabel: string;
  issueLabel: string;
  quickOptions: string[];
  description: string;
  attachments: Attachment[];
  booking?: { kind?: string; code?: string; title?: string; subtitle?: string; status?: string };
  preferredContact?: { method?: string; value?: string };
  expectedResolution?: string;
  status: Status;
  priority: Priority;
  resolutionNote?: string;
  messages?: { _id: string; from: "RIDER" | "ADMIN"; text?: string; attachments?: Attachment[]; staffName?: string; at: string }[];
  statusHistory?: { status: string; by?: string; note?: string; at: string }[];
  adminUnread?: boolean;
  lastActivityAt: string;
  createdAt: string;
}

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/support-tickets`;
const SERVICES = [
  ["", "All services"], ["CAB", "Cabs"], ["TOUR", "Tours"], ["VISA", "Visa"], ["PAYMENT", "Payments"], ["SAFETY", "Safety"],
  ["FLIGHT", "Flights"], ["TRAIN", "Trains"], ["HOTEL", "Hotels"], ["OTHER", "Others"],
] as const;
const STATUS_LABEL: Record<Status, string> = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed" };
const statusTone = (s: Status) => (s === "OPEN" ? fleetTone.amber : s === "IN_PROGRESS" ? fleetTone.sky : s === "RESOLVED" ? fleetTone.emerald : fleetTone.slate);
const priorityTone = (p: Priority) => (p === "URGENT" ? fleetTone.red : p === "HIGH" ? fleetTone.orange : fleetTone.slate);
const fmt = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");

export default function SupportTicketsPage() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ACTIVE");
  const [service, setService] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const auth = { Authorization: `Bearer ${accessToken}` };
  const list = useQuery<{ data: Ticket[]; total: number; pages: number; counts: Record<string, number> }>({
    queryKey: ["adminSupportTickets", status, service, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status !== "ALL") params.set("status", status);
      if (service) params.set("service", service);
      if (search) params.set("q", search);
      const res = await fetch(`${API}?${params}`, { headers: auth });
      if (!res.ok) throw new Error("Failed to load support tickets");
      return res.json();
    },
    enabled: !!accessToken,
    refetchInterval: 30000,
  });

  const counts = list.data?.counts || {};
  const tickets = list.data?.data || [];

  return (
    <FleetPage className="gap-4">
      <FleetPageHeader icon={LifeBuoy} title="Support Tickets" description="Issues raised by riders from Help & Support in the MBGO app." />

      <FleetKpiStrip
        items={[
          { label: "Open", value: counts.OPEN || 0, icon: Inbox, tone: "amber" },
          { label: "In progress", value: counts.IN_PROGRESS || 0, icon: Clock3, tone: "sky" },
          { label: "Resolved", value: counts.RESOLVED || 0, icon: CheckCircle2, tone: "emerald" },
          { label: "Closed", value: counts.CLOSED || 0, icon: AlertTriangle, tone: "slate" },
        ]}
      />

      <FleetPanel
        title="Tickets"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select className={fleetSelectClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="ACTIVE">Open + in progress</option>
              <option value="ALL">All statuses</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select className={fleetSelectClass} value={service} onChange={(e) => { setService(e.target.value); setPage(1); }}>
              {SERVICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }}>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticket ID, rider, phone, booking…" className="h-8 w-56 text-[13px]" />
            </form>
          </div>
        }
      >
        {list.isLoading ? (
          <div className="flex justify-center py-10"><Loader size="lg" message="Loading tickets..." /></div>
        ) : list.isError ? (
          <p className="py-10 text-center text-red-600">{String((list.error as Error)?.message)}</p>
        ) : tickets.length === 0 ? (
          <FleetEmptyState icon={LifeBuoy} title="No tickets here" hint="Tickets raised from the app will appear here." />
        ) : (
          <>
            <Table className="text-[13px]">
              <TableHeader className="bg-slate-50/60">
                <TableRow>
                  {["Ticket", "Rider", "Issue", "Booking", "Priority", "Status", "Last activity"].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t._id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(t._id)}>
                    <TableCell className="py-2.5">
                      <p className="font-mono text-[12px] font-semibold text-slate-900">{t.ticketId}{t.adminUnread && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[#FE5300]" title="New activity" />}</p>
                      <p className="text-[11px] text-slate-500">{fmt(t.createdAt)}</p>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <p className="font-medium text-slate-800">{t.riderId?.fullName || "-"}</p>
                      <p className="text-[11px] text-slate-500">{t.riderId?.mobileNumber || ""}</p>
                    </TableCell>
                    <TableCell className="max-w-[260px] py-2.5">
                      <p className="font-medium text-slate-800">{t.serviceLabel} · {t.issueLabel}</p>
                      <p className="truncate text-[11px] text-slate-500">{t.description}</p>
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-slate-600">{t.booking?.code ? <><p className="font-mono">{t.booking.code}</p><p className="truncate text-[11px] text-slate-500">{t.booking.title}</p></> : "—"}</TableCell>
                    <TableCell className="py-2.5"><FleetPill className={priorityTone(t.priority)}>{t.priority}</FleetPill></TableCell>
                    <TableCell className="py-2.5"><FleetPill className={statusTone(t.status)}>{STATUS_LABEL[t.status]}</FleetPill></TableCell>
                    <TableCell className="py-2.5 text-[12px] text-slate-500">{fmt(t.lastActivityAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(list.data?.pages || 1) > 1 && (
              <div className="flex items-center justify-end gap-2 pt-3 text-[12px]">
                <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span>Page {page} of {list.data?.pages}</span>
                <Button variant="outline" size="sm" className="h-7" disabled={page >= (list.data?.pages || 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </FleetPanel>

      <TicketSheet
        id={openId}
        onClose={() => setOpenId(null)}
        accessToken={accessToken}
        onChanged={() => queryClient.invalidateQueries({ queryKey: ["adminSupportTickets"] })}
      />
    </FleetPage>
  );
}

function TicketSheet({ id, onClose, accessToken, onChanged }: { id: string | null; onClose: () => void; accessToken: string; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const detail = useQuery<{ data: Ticket }>({
    queryKey: ["adminSupportTicket", id],
    queryFn: async () => {
      const res = await fetch(`${API}/${id}`, { headers });
      if (!res.ok) throw new Error("Failed to load ticket");
      return res.json();
    },
    enabled: !!id && !!accessToken,
  });
  const t = detail.data?.data;
  const resolution = note ?? t?.resolutionNote ?? "";

  const save = async (path: string, method: string, body: object, okMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/${id}${path}`, { method, headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not save");
      queryClient.setQueryData(["adminSupportTicket", id], json);
      onChanged();
      toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => { if (!o) { onClose(); setReply(""); setNote(null); } }}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4">
          <SheetTitle className="text-[15px] font-semibold">{t ? `${t.ticketId} · ${t.serviceLabel}` : "Ticket"}</SheetTitle>
          <SheetDescription className="text-[12px]">{t ? `${t.issueLabel} · raised ${fmt(t.createdAt)}` : ""}</SheetDescription>
        </SheetHeader>
        {!t ? (
          <div className="flex justify-center py-10"><Loader size="lg" message="Loading..." /></div>
        ) : (
          <div className="space-y-4 p-5 text-[13px]">
            {/* Rider + contact */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{t.riderId?.fullName || "Rider"}</p>
                  <p className="text-[12px] text-slate-500">{t.riderId?.mobileNumber}</p>
                </div>
                <div className="flex gap-2">
                  {t.riderId?.mobileNumber && <a href={`tel:${t.riderId.mobileNumber}`} className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[12px]"><Phone className="h-3.5 w-3.5" />Call</a>}
                  {t.riderId?.mobileNumber && <a href={`https://wa.me/91${String(t.riderId.mobileNumber).replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[12px]"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-500">Preferred contact: <span className="font-medium text-slate-700">{t.preferredContact?.method || "CALL"}</span>{t.preferredContact?.value ? ` · ${t.preferredContact.value}` : ""}</p>
            </div>

            {/* Booking */}
            {t.booking?.code && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-medium uppercase text-slate-400">Booking</p>
                <p className="font-semibold text-slate-900">{t.booking.title} <span className="font-mono text-[12px] font-normal text-slate-500">{t.booking.code}</span></p>
                <p className="text-[12px] text-slate-500">{t.booking.subtitle}{t.booking.status ? ` · ${t.booking.status}` : ""}</p>
              </div>
            )}

            {/* Issue */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase text-slate-400">Issue</p>
              <p className="font-semibold text-slate-900">{t.issueLabel}</p>
              {t.quickOptions?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{t.quickOptions.map((o) => <span key={o} className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] text-orange-700">{o}</span>)}</div>}
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{t.description}</p>
              {t.expectedResolution && <p className="mt-2 text-[12px] text-slate-500">Expected: {t.expectedResolution}</p>}
              {t.attachments?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded border bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Status & priority */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <FleetPill className={statusTone(t.status)}>{STATUS_LABEL[t.status]}</FleetPill>
                <select className={fleetSelectClass} value={t.priority} disabled={busy} onChange={(e) => save("", "PATCH", { priority: e.target.value }, "Priority updated")}>
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p} priority</option>)}
                </select>
              </div>
              <Textarea value={resolution} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note (shown to the rider when resolved)" className="min-h-[70px] text-[13px]" />
              <div className="flex flex-wrap gap-2">
                {t.status !== "IN_PROGRESS" && t.status !== "CLOSED" && <Button size="sm" variant="outline" className="h-8 text-[12px]" disabled={busy} onClick={() => save("", "PATCH", { status: "IN_PROGRESS" }, "Marked in progress")}>Mark in progress</Button>}
                {t.status !== "RESOLVED" && t.status !== "CLOSED" && <Button size="sm" className="h-8 bg-emerald-600 text-[12px] hover:bg-emerald-700" disabled={busy} onClick={() => save("", "PATCH", { status: "RESOLVED", resolutionNote: resolution }, "Ticket resolved")}>Resolve</Button>}
                {t.status !== "CLOSED" && <Button size="sm" variant="outline" className="h-8 text-[12px]" disabled={busy} onClick={() => window.confirm("Close this ticket? The rider won't be able to reply.") && save("", "PATCH", { status: "CLOSED" }, "Ticket closed")}>Close</Button>}
                {(t.status === "RESOLVED" || t.status === "CLOSED") && <Button size="sm" variant="outline" className="h-8 text-[12px]" disabled={busy} onClick={() => save("", "PATCH", { status: "OPEN" }, "Ticket reopened")}>Reopen</Button>}
                {note !== null && note !== (t.resolutionNote || "") && <Button size="sm" variant="ghost" className="h-8 text-[12px]" disabled={busy} onClick={async () => { if (await save("", "PATCH", { resolutionNote: resolution }, "Note saved")) setNote(null); }}>Save note</Button>}
              </div>
            </div>

            {/* Conversation */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-medium uppercase text-slate-400">Conversation</p>
              {(t.messages || []).length === 0 && <p className="text-[12px] text-slate-500">No messages yet.</p>}
              <div className="space-y-2">
                {(t.messages || []).map((m) => (
                  <div key={m._id} className={`max-w-[85%] rounded-lg px-3 py-2 ${m.from === "ADMIN" ? "ml-auto bg-orange-50" : "bg-slate-100"}`}>
                    <p className="text-[11px] font-medium text-slate-500">{m.from === "ADMIN" ? m.staffName || "Support" : t.riderId?.fullName || "Rider"} · {fmt(m.at)}</p>
                    {m.text && <p className="whitespace-pre-wrap text-slate-800">{m.text}</p>}
                    {(m.attachments || []).map((a, i) => <a key={i} href={a.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-1 text-[12px] text-sky-700"><ImageIcon className="h-3 w-3" />Photo {i + 1}</a>)}
                  </div>
                ))}
              </div>
              {t.status !== "CLOSED" && (
                <div className="mt-3 flex gap-2">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the rider (they'll get a notification)" className="min-h-[60px] text-[13px]" />
                  <Button className="h-auto bg-[#FE5300] hover:bg-[#e54b00]" disabled={busy || !reply.trim()} onClick={async () => { if (await save("/messages", "POST", { text: reply }, "Reply sent")) setReply(""); }}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* History */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-medium uppercase text-slate-400">Status history</p>
              {(t.statusHistory || []).map((h, i) => (
                <p key={i} className="text-[12px] text-slate-600">{fmt(h.at)} · <span className="font-medium">{STATUS_LABEL[h.status as Status] || h.status}</span>{h.note ? ` · ${h.note}` : ""}</p>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
