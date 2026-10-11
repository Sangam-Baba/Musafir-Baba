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
import { Ban, Hourglass, IndianRupee, CheckCircle2 } from "lucide-react";
import { FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTone, FleetEmptyState, FleetKpiStrip, fleetTh, fleetSelectClass } from "@/components/admin/fleet/FleetUI";

// Cancellations raised by riders in the MBGO app (cabs, tours, visa).
// Refunds are processed manually (e.g. PayU dashboard) and recorded here.

interface Cancellation {
  _id: string;
  requestId: string;
  service: "CAB" | "TOUR" | "VISA";
  bookingCode: string;
  bookingTitle?: string;
  bookingSubtitle?: string;
  bookingStatusAtRequest?: string;
  riderId?: { fullName?: string; mobileNumber?: string } | null;
  reasonLabel: string;
  comment?: string;
  type: "INSTANT" | "REQUEST";
  status: "REQUESTED" | "APPROVED" | "REJECTED";
  paidAmount: number;
  refund?: { status: "NOT_APPLICABLE" | "PENDING" | "REFUNDED"; amount?: number; reference?: string; note?: string; processedAt?: string; processedBy?: string };
  adminNote?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/cancellations`;
const SERVICE_LABEL = { CAB: "Cab", TOUR: "Tour", VISA: "Visa" } as const;
const inr = (n?: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
const statusTone = (s: Cancellation["status"]) => (s === "REQUESTED" ? fleetTone.amber : s === "APPROVED" ? fleetTone.emerald : fleetTone.slate);
const refundTone = (s?: string) => (s === "PENDING" ? fleetTone.orange : s === "REFUNDED" ? fleetTone.emerald : fleetTone.slate);
const refundLabel = (s?: string) => (s === "PENDING" ? "Refund pending" : s === "REFUNDED" ? "Refunded" : "No refund");

export default function CancellationsPage() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [refund, setRefund] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Cancellation | null>(null);

  const list = useQuery<{ data: Cancellation[]; pages: number; counts: { pendingRequests: number; pendingRefunds: number } }>({
    queryKey: ["adminCancellations", status, service, refund, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page) });
      if (status) p.set("status", status);
      if (service) p.set("service", service);
      if (refund) p.set("refund", refund);
      const res = await fetch(`${API}?${p}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("Failed to load cancellations");
      return res.json();
    },
    enabled: !!accessToken,
    refetchInterval: 30000,
  });
  const items = list.data?.data || [];

  return (
    <FleetPage className="gap-4">
      <FleetPageHeader icon={Ban} title="Cancellations" description="Rider cancellations from the MBGO app. Approve tour/visa requests and record refunds." />
      <FleetKpiStrip
        items={[
          { label: "Requests to review", value: list.data?.counts.pendingRequests ?? 0, icon: Hourglass, tone: "amber" },
          { label: "Refunds pending", value: list.data?.counts.pendingRefunds ?? 0, icon: IndianRupee, tone: "orange" },
        ]}
      />
      <FleetPanel
        title="Cancellations"
        actions={
          <div className="flex flex-wrap gap-2">
            <select className={fleetSelectClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="REQUESTED">To review</option>
              <option value="APPROVED">Cancelled</option>
              <option value="REJECTED">Declined</option>
            </select>
            <select className={fleetSelectClass} value={service} onChange={(e) => { setService(e.target.value); setPage(1); }}>
              <option value="">All services</option>
              <option value="CAB">Cabs</option>
              <option value="TOUR">Tours</option>
              <option value="VISA">Visa</option>
            </select>
            <select className={fleetSelectClass} value={refund} onChange={(e) => { setRefund(e.target.value); setPage(1); }}>
              <option value="">Any refund</option>
              <option value="PENDING">Refund pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="NOT_APPLICABLE">No refund</option>
            </select>
          </div>
        }
      >
        {list.isLoading ? (
          <div className="flex justify-center py-10"><Loader size="lg" message="Loading..." /></div>
        ) : list.isError ? (
          <p className="py-10 text-center text-red-600">{String((list.error as Error)?.message)}</p>
        ) : items.length === 0 ? (
          <FleetEmptyState icon={Ban} title="No cancellations here" />
        ) : (
          <>
            <Table className="text-[13px]">
              <TableHeader className="bg-slate-50/60">
                <TableRow>{["Request", "Rider", "Booking", "Reason", "Paid", "Status", "Refund"].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c._id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(c)}>
                    <TableCell className="py-2.5"><p className="font-mono text-[12px] font-semibold">{c.requestId}</p><p className="text-[11px] text-slate-500">{fmt(c.createdAt)}</p></TableCell>
                    <TableCell className="py-2.5"><p className="font-medium">{c.riderId?.fullName || "-"}</p><p className="text-[11px] text-slate-500">{c.riderId?.mobileNumber}</p></TableCell>
                    <TableCell className="max-w-[220px] py-2.5"><p className="font-medium">{SERVICE_LABEL[c.service]} · <span className="font-mono">{c.bookingCode}</span></p><p className="truncate text-[11px] text-slate-500">{c.bookingTitle}</p></TableCell>
                    <TableCell className="max-w-[200px] py-2.5"><p>{c.reasonLabel}</p>{c.comment && <p className="truncate text-[11px] text-slate-500">{c.comment}</p>}</TableCell>
                    <TableCell className="py-2.5 font-medium">{c.paidAmount > 0 ? inr(c.paidAmount) : "—"}</TableCell>
                    <TableCell className="py-2.5"><FleetPill className={statusTone(c.status)}>{c.status === "REQUESTED" ? "To review" : c.status === "APPROVED" ? "Cancelled" : "Declined"}</FleetPill></TableCell>
                    <TableCell className="py-2.5"><FleetPill className={refundTone(c.refund?.status)}>{refundLabel(c.refund?.status)}</FleetPill></TableCell>
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

      <CancellationSheet item={open} onClose={() => setOpen(null)} accessToken={accessToken} onSaved={(c) => { setOpen(c); queryClient.invalidateQueries({ queryKey: ["adminCancellations"] }); }} />
    </FleetPage>
  );
}

function CancellationSheet({ item, onClose, accessToken, onSaved }: { item: Cancellation | null; onClose: () => void; accessToken: string; onSaved: (c: Cancellation) => void }) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (path: string, body: object, ok: string) => {
    if (!item) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/${item._id}${path}`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not save");
      toast.success(ok);
      onSaved(json.data);
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) { onClose(); setNote(""); setAmount(""); setReference(""); } }}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 sm:max-w-lg">
        {item && (
          <>
            <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4">
              <SheetTitle className="text-[15px] font-semibold">{item.requestId} · {SERVICE_LABEL[item.service]} cancellation</SheetTitle>
              <SheetDescription className="text-[12px]">Raised {fmt(item.createdAt)} · {item.type === "INSTANT" ? "Cancelled instantly" : "Needs review"}</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-5 text-[13px]">
              <div className="rounded-lg border bg-white p-3">
                <p className="text-[11px] uppercase text-slate-400">Booking</p>
                <p className="font-semibold">{item.bookingTitle} <span className="font-mono text-[12px] font-normal text-slate-500">{item.bookingCode}</span></p>
                <p className="text-[12px] text-slate-500">{item.bookingSubtitle} · status when cancelled: {item.bookingStatusAtRequest}</p>
                <p className="mt-1 text-[12px]">Rider: <span className="font-medium">{item.riderId?.fullName}</span> · {item.riderId?.mobileNumber}</p>
                <p className="text-[12px]">Paid online: <span className="font-semibold">{item.paidAmount > 0 ? inr(item.paidAmount) : "Nothing paid"}</span></p>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <p className="text-[11px] uppercase text-slate-400">Reason</p>
                <p className="font-semibold">{item.reasonLabel}</p>
                {item.comment && <p className="mt-1 whitespace-pre-wrap text-slate-700">{item.comment}</p>}
              </div>

              {item.status === "REQUESTED" ? (
                <div className="space-y-2 rounded-lg border bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Decision</p>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the rider (required to decline)" className="min-h-[70px] text-[13px]" />
                  <div className="flex gap-2">
                    <Button className="h-8 bg-emerald-600 text-[12px] hover:bg-emerald-700" disabled={busy} onClick={() => window.confirm("Approve and cancel this booking?") && call("/decision", { action: "APPROVE", adminNote: note }, "Cancellation approved")}>Approve cancellation</Button>
                    <Button variant="outline" className="h-8 text-[12px]" disabled={busy || !note.trim()} onClick={() => call("/decision", { action: "REJECT", adminNote: note }, "Request declined")}>Decline</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-[11px] uppercase text-slate-400">Decision</p>
                  <FleetPill className={statusTone(item.status)}>{item.status === "APPROVED" ? "Cancelled" : "Declined"}</FleetPill>
                  <p className="mt-1 text-[12px] text-slate-500">{item.decidedBy === "SYSTEM" ? "Cancelled instantly by the rider" : `By ${item.decidedBy || "-"} · ${fmt(item.decidedAt)}`}</p>
                  {item.adminNote && <p className="mt-1 text-slate-700">{item.adminNote}</p>}
                </div>
              )}

              {item.status === "APPROVED" && (
                <div className="space-y-2 rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase text-slate-400">Refund</p>
                    <FleetPill className={refundTone(item.refund?.status)}>{refundLabel(item.refund?.status)}</FleetPill>
                  </div>
                  {item.refund?.status === "REFUNDED" ? (
                    <p className="text-[12px] text-slate-600"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />{inr(item.refund.amount)} refunded{item.refund.reference ? ` · Ref ${item.refund.reference}` : ""} · {item.refund.processedBy} · {fmt(item.refund.processedAt)}</p>
                  ) : item.paidAmount > 0 ? (
                    <>
                      <p className="text-[12px] text-slate-500">Refund in the PayU dashboard, then record it here (rider is notified).</p>
                      <div className="flex gap-2">
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount (max ${item.paidAmount})`} className="h-8 text-[13px]" />
                        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PayU / bank reference" className="h-8 text-[13px]" />
                      </div>
                      <div className="flex gap-2">
                        <Button className="h-8 bg-[#FE5300] text-[12px] hover:bg-[#e54b00]" disabled={busy || !amount} onClick={() => call("/refund", { status: "REFUNDED", amount: Number(amount), reference }, "Refund recorded")}>Mark refunded</Button>
                        {item.refund?.status !== "NOT_APPLICABLE" && <Button variant="outline" className="h-8 text-[12px]" disabled={busy} onClick={() => window.confirm("Mark as no refund?") && call("/refund", { status: "NOT_APPLICABLE", note: "No refund as per policy" }, "Marked as no refund")}>No refund</Button>}
                        {item.refund?.status === "NOT_APPLICABLE" && <Button variant="outline" className="h-8 text-[12px]" disabled={busy} onClick={() => call("/refund", { status: "PENDING" }, "Marked refund pending")}>Set pending</Button>}
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-500">Nothing was paid online.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
