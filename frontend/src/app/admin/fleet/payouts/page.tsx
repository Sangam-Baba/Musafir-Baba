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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Banknote, CheckCircle2, Clock, Copy, Landmark, Search } from "lucide-react";
import { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";

// MBConnect driver withdrawals to bank. The money already left the driver's
// wallet when they requested it. Admin transfers it manually, then marks the
// request Paid (with the UTR) or Cancelled (money goes back to the wallet).
// The driver gets a notification at every step.

type Status = "REQUESTED" | "PROCESSING" | "PAID" | "CANCELLED";
interface Payout {
  _id: string;
  code: string;
  amount: number;
  status: Status;
  partnerId?: { _id: string; fullName?: string; mobileNumber?: string } | null;
  bank?: { accountHolderName?: string; bankName?: string; accountNumber?: string; ifsc?: string; upiId?: string; status?: string };
  utr?: string;
  adminNote?: string;
  cancelReason?: string;
  cancelledBy?: "DRIVER" | "ADMIN";
  decidedBy?: string;
  createdAt: string;
  paidAt?: string;
  cancelledAt?: string;
}
type Counts = Partial<Record<Status, { count: number; amount: number }>>;
type Action = "PROCESSING" | "PAID" | "CANCEL";

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-payouts`;
const inr = (n?: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const STATUS_META: Record<Status, { label: string; tone: string }> = {
  REQUESTED: { label: "Requested", tone: fleetTone.amber },
  PROCESSING: { label: "Processing", tone: fleetTone.sky },
  PAID: { label: "Paid", tone: fleetTone.emerald },
  CANCELLED: { label: "Cancelled", tone: fleetTone.slate },
};
const FILTERS: { key: string; label: string }[] = [
  { key: "OPEN", label: "To do" },
  { key: "REQUESTED", label: "Requested" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PAID", label: "Paid" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "", label: "All" },
];
const ACTION_TEXT: Record<Action, { title: string; button: string }> = {
  PROCESSING: { title: "Mark as processing", button: "Mark processing" },
  PAID: { title: "Mark as paid", button: "Mark paid" },
  CANCEL: { title: "Cancel withdrawal", button: "Cancel withdrawal" },
};

export default function PartnerPayoutsPage() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const permissions = useAdminAuthStore((s) => s.permissions) as string[];
  const role = useAdminAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [status, setStatus] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<{ payout: Payout; action: Action } | null>(null);
  const [utr, setUtr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError } = useQuery<{ data: Payout[]; counts: Counts }>({
    queryKey: ["adminPartnerPayouts", status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`${API}?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("Failed to load withdrawals");
      return res.json();
    },
    staleTime: 15000,
  });

  if (!(role === "admin" || role === "superadmin" || permissions?.includes("partner-verification"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }

  const items = data?.data ?? [];
  const counts = data?.counts ?? {};
  const open = (counts.REQUESTED?.count || 0) + (counts.PROCESSING?.count || 0);
  const openAmount = (counts.REQUESTED?.amount || 0) + (counts.PROCESSING?.amount || 0);

  const startAction = (payout: Payout, action: Action) => {
    setActing({ payout, action });
    setUtr("");
    setNote("");
  };

  const submit = async () => {
    if (!acting) return;
    if (acting.action === "PAID" && utr.trim().length < 4) return toast.error("Enter the UTR / bank reference number");
    if (acting.action === "CANCEL" && !note.trim()) return toast.error("Add a reason — the driver will see it");
    setBusy(true);
    try {
      const res = await fetch(`${API}/${acting.payout._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: acting.action, utr: utr.trim(), note: note.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Update failed");
      toast.success(
        acting.action === "PAID" ? "Marked paid. Driver notified." : acting.action === "CANCEL" ? "Cancelled. Money returned to the driver's wallet." : "Marked processing. Driver notified."
      );
      setActing(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["adminPartnerPayouts"] });
      qc.invalidateQueries({ queryKey: ["adminPartnerWallets"] });
    }
  };

  const copy = (text?: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => toast.success("Copied"), () => {});
  };

  return (
    <FleetPage>
      <FleetPageHeader
        icon={Banknote}
        title="Payout Requests"
        description="Driver withdrawals from the MBConnect wallet to their bank. Transfer the amount manually, then mark it paid with the UTR — or cancel it to return the money to the driver's wallet."
      />

      <FleetKpiStrip
        items={[
          { label: "To do (requested + processing)", value: `${open} · ${inr(openAmount)}`, icon: Clock, tone: open ? "amber" : "slate" },
          { label: "Paid to banks", value: `${counts.PAID?.count || 0} · ${inr(counts.PAID?.amount)}`, icon: CheckCircle2, tone: "emerald" },
        ]}
      />

      <FleetPanel
        title="Withdrawals"
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key || "all"}
                  type="button"
                  onClick={() => setStatus(f.key)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${status === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-56">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search driver, PO, UTR" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-[13px]" />
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" message="Loading withdrawals..." />
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-[13px] text-red-600">Could not load withdrawals.</p>
        ) : items.length === 0 ? (
          <FleetEmptyState icon={Banknote} title={status === "OPEN" ? "Nothing to transfer right now" : "No withdrawals"} />
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-[13px]">
              <TableHeader className="bg-slate-50/60">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  {["Request", "Driver", "Amount", "Transfer to", "Status", ""].map((h) => (
                    <TableHead key={h} className={fleetTh}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const meta = STATUS_META[p.status];
                  const isOpen = p.status === "REQUESTED" || p.status === "PROCESSING";
                  return (
                    <TableRow key={p._id} className="border-slate-100 align-top">
                      <TableCell className="py-2.5">
                        <p className="font-mono text-[12px] font-semibold text-slate-800">{p.code}</p>
                        <p className="text-[11px] text-slate-500">{fmt(p.createdAt)}</p>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="font-medium text-slate-900">{p.partnerId?.fullName || "—"}</p>
                        <p className="text-[11px] tabular-nums text-slate-500">{p.partnerId?.mobileNumber}</p>
                      </TableCell>
                      <TableCell className="py-2.5 font-semibold tabular-nums text-slate-900">{inr(p.amount)}</TableCell>
                      <TableCell className="py-2.5 whitespace-normal">
                        <p className="flex items-center gap-1 font-medium text-slate-800">
                          <Landmark size={12} className="text-slate-400" />
                          {p.bank?.bankName || "—"}
                          {p.bank?.status && p.bank.status !== "Verified" && (
                            <FleetPill className={p.bank.status === "Rejected" ? fleetTone.red : fleetTone.amber}>Bank {p.bank.status.toLowerCase()}</FleetPill>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-600">{p.bank?.accountHolderName}</p>
                        <button type="button" onClick={() => copy(p.bank?.accountNumber)} className="flex items-center gap-1 font-mono text-[12px] text-slate-800 hover:text-[#FE5300]" title="Copy account number">
                          A/c {p.bank?.accountNumber} <Copy size={11} />
                        </button>
                        <button type="button" onClick={() => copy(p.bank?.ifsc)} className="flex items-center gap-1 font-mono text-[12px] text-slate-800 hover:text-[#FE5300]" title="Copy IFSC">
                          IFSC {p.bank?.ifsc} <Copy size={11} />
                        </button>
                        {p.bank?.upiId && <p className="text-[11px] text-slate-500">UPI {p.bank.upiId}</p>}
                      </TableCell>
                      <TableCell className="py-2.5 whitespace-normal">
                        <FleetPill className={meta.tone}>{meta.label}</FleetPill>
                        {p.status === "PAID" && <p className="mt-1 text-[11px] text-slate-600">UTR {p.utr} · {fmt(p.paidAt)}</p>}
                        {p.status === "CANCELLED" && (
                          <p className="mt-1 max-w-[220px] text-[11px] text-slate-500">
                            {p.cancelledBy === "DRIVER" ? "By driver" : "By admin"} · {p.cancelReason}
                          </p>
                        )}
                        {p.decidedBy && p.status !== "REQUESTED" && <p className="text-[11px] text-slate-400">by {p.decidedBy}</p>}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {isOpen && (
                          <div className="flex flex-col gap-1.5">
                            {p.status === "REQUESTED" && (
                              <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => startAction(p, "PROCESSING")}>
                                Mark processing
                              </Button>
                            )}
                            <Button size="sm" className="h-7 bg-emerald-600 text-[12px] hover:bg-emerald-700" onClick={() => startAction(p, "PAID")}>
                              Mark paid
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[12px] text-red-600" onClick={() => startAction(p, "CANCEL")}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </FleetPanel>

      <Dialog open={!!acting} onOpenChange={(o) => !o && !busy && setActing(null)}>
        <DialogContent className="sm:max-w-md">
          {acting && (
            <>
              <DialogHeader>
                <DialogTitle>{ACTION_TEXT[acting.action].title}</DialogTitle>
                <DialogDescription>
                  {acting.payout.code} · {inr(acting.payout.amount)} to {acting.payout.partnerId?.fullName || "driver"} ({acting.payout.bank?.bankName} a/c {acting.payout.bank?.accountNumber})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2.5">
                {acting.action === "PAID" && (
                  <>
                    <p className="text-[12px] text-slate-600">Only mark paid after the bank transfer is done. The driver is notified with the UTR.</p>
                    <Input placeholder="UTR / bank reference number (required)" value={utr} onChange={(e) => setUtr(e.target.value)} className="h-9 text-[13px]" />
                  </>
                )}
                {acting.action === "CANCEL" && (
                  <p className="text-[12px] text-slate-600">{inr(acting.payout.amount)} goes back to the driver&apos;s wallet. The driver sees this reason.</p>
                )}
                {acting.action === "PROCESSING" && <p className="text-[12px] text-slate-600">Tells the driver the transfer has started.</p>}
                <Textarea
                  placeholder={acting.action === "CANCEL" ? "Reason (required)" : "Note (optional, internal)"}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-16 text-[13px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={busy} onClick={() => setActing(null)}>Back</Button>
                <Button
                  disabled={busy}
                  onClick={submit}
                  className={acting.action === "CANCEL" ? "bg-red-600 hover:bg-red-700" : acting.action === "PAID" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {busy ? "Saving..." : ACTION_TEXT[acting.action].button}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </FleetPage>
  );
}
