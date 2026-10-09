"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ChevronRight, Hourglass, IndianRupee, Search, Wallet } from "lucide-react";
import { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";

interface WalletListItem {
  partnerId: string;
  authId: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  status: string;
  walletBalance: number;
  pendingWalletBalance: number;
}

interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  walletBalanceAfter: number;
  pendingWalletBalanceAfter: number;
  adminName?: string;
  note?: string;
  createdAt: string;
}

interface WalletDetail extends WalletListItem {
  transactions: WalletTransaction[];
}

const getWallets = async (accessToken: string, search: string) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", "100");
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-wallets?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load wallets");
  return res.json() as Promise<{ success: boolean; data: WalletListItem[] }>;
};

const getWalletDetail = async (accessToken: string, partnerId: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-wallets/${partnerId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load wallet detail");
  const json = await res.json();
  return json.data as WalletDetail;
};

const PARTNER_STATUS_META: Record<string, { label: string; tone: string }> = {
  Active: { label: "Active", tone: fleetTone.emerald },
  Approved: { label: "Approved", tone: fleetTone.emerald },
  PendingVerification: { label: "Pending review", tone: fleetTone.amber },
  Hold: { label: "On hold", tone: fleetTone.orange },
  Rejected: { label: "Rejected", tone: fleetTone.red },
  Blacklisted: { label: "Blacklisted", tone: fleetTone.red },
  Suspended: { label: "Suspended", tone: fleetTone.red },
  "In-Active": { label: "Inactive", tone: fleetTone.slate },
  Draft: { label: "Draft", tone: fleetTone.slate },
  Deleted: { label: "Deleted", tone: fleetTone.slate },
};

const TRANSACTION_LABEL: Record<string, string> = {
  trip_pending_credit: "Trip earning (pending)",
  admin_release: "Released to available",
  admin_credit: "Manual credit",
  admin_debit: "Manual debit",
};

function WalletsPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const [releaseAmount, setReleaseAmount] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDirection, setAdjustDirection] = useState<"credit" | "debit">("credit");
  const [adjustReason, setAdjustReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminPartnerWallets", search],
    queryFn: () => getWallets(accessToken, search),
    staleTime: 1000 * 30,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["adminPartnerWalletDetail", selectedPartnerId],
    queryFn: () => getWalletDetail(accessToken, selectedPartnerId as string),
    enabled: !!selectedPartnerId,
  });

  const wallets = data?.data ?? [];
  const totals = {
    available: wallets.reduce((sum, w) => sum + w.walletBalance, 0),
    pending: wallets.reduce((sum, w) => sum + w.pendingWalletBalance, 0),
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["adminPartnerWallets"] });
    if (selectedPartnerId) queryClient.invalidateQueries({ queryKey: ["adminPartnerWalletDetail", selectedPartnerId] });
  };

  const closeModal = () => {
    setSelectedPartnerId(null);
    setReleaseAmount("");
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustDirection("credit");
  };

  const handleRelease = async (full: boolean) => {
    if (!selectedPartnerId || !detail) return;
    const amount = full ? detail.pendingWalletBalance : parseFloat(releaseAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount to release");
      return;
    }
    setIsActing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-wallets/${selectedPartnerId}/release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ amount }),
        }
      );
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Released successfully");
        setReleaseAmount("");
        refresh();
      } else {
        toast.error(result.message || "Could not release funds");
      }
    } catch {
      toast.error("Action failed, please try again");
    } finally {
      setIsActing(false);
    }
  };

  const handleAdjust = async () => {
    if (!selectedPartnerId) return;
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setIsActing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-wallets/${selectedPartnerId}/adjust`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ amount, direction: adjustDirection, reason: adjustReason.trim() }),
        }
      );
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Wallet adjusted");
        setAdjustAmount("");
        setAdjustReason("");
        refresh();
      } else {
        toast.error(result.message || "Could not adjust wallet");
      }
    } catch {
      toast.error("Action failed, please try again");
    } finally {
      setIsActing(false);
    }
  };

  if (!(role === "admin" || role === "superadmin" || permissions.includes("partner-verification"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }

  const partnerStatusPill = (status: string) => {
    const meta = PARTNER_STATUS_META[status] || { label: status, tone: fleetTone.slate };
    return <FleetPill className={meta.tone}>{meta.label}</FleetPill>;
  };

  return (
    <FleetPage>
      <FleetPageHeader
        icon={Wallet}
        title="Partner Wallets"
        description={
          <>
            Trip earnings land in a partner&apos;s pending balance first. Release pending funds to their available
            balance, or make a manual adjustment, from here.
          </>
        }
      />

      <FleetKpiStrip
        items={[
          { label: "Total available balance", value: `₹${totals.available.toLocaleString("en-IN")}`, icon: IndianRupee, tone: "emerald" },
          { label: "Total pending balance", value: `₹${totals.pending.toLocaleString("en-IN")}`, icon: Hourglass, tone: "amber" },
        ]}
      />

      <FleetPanel
        title="Partners"
        description="Open a partner to view transaction history and manage their wallet"
        actions={
          <div className="relative w-full md:w-64">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name or mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-[13px]"
            />
          </div>
        }
      >
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading wallets..." />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
            </div>
          ) : wallets.length === 0 ? (
            <FleetEmptyState icon={Wallet} title="No partners found" />
          ) : (
            <>
              {/* Mobile list */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {wallets.map((w) => (
                  <li key={w.partnerId}>
                    <button
                      type="button"
                      onClick={() => setSelectedPartnerId(w.partnerId)}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">{w.fullName}</p>
                          <p className="text-[11px] tabular-nums text-slate-500">{w.mobileNumber}</p>
                        </div>
                        {partnerStatusPill(w.status)}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[12px]">
                        <span className="text-slate-500">Available <span className="font-semibold tabular-nums text-emerald-700">₹{w.walletBalance.toLocaleString("en-IN")}</span></span>
                        <span className="text-slate-500">Pending <span className="font-semibold tabular-nums text-amber-700">₹{w.pendingWalletBalance.toLocaleString("en-IN")}</span></span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table className="table-fixed text-[13px]">
                  <TableHeader className="bg-slate-50/60">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className={`pl-4 ${fleetTh}`}>Partner</TableHead>
                      <TableHead className={`hidden w-[150px] lg:table-cell ${fleetTh}`}>Mobile</TableHead>
                      <TableHead className={`w-[150px] ${fleetTh}`}>Status</TableHead>
                      <TableHead className={`w-[140px] text-right ${fleetTh}`}>Available</TableHead>
                      <TableHead className={`w-[140px] text-right ${fleetTh}`}>Pending</TableHead>
                      <TableHead className={`w-[56px] pr-4 ${fleetTh}`} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallets.map((w) => (
                      <TableRow
                        key={w.partnerId}
                        className="group cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/70"
                        onClick={() => setSelectedPartnerId(w.partnerId)}
                      >
                        <TableCell className="pl-4 py-2.5 whitespace-normal">
                          <p className="truncate font-medium text-slate-900">{w.fullName}</p>
                          <p className="text-[11px] tabular-nums text-slate-500 lg:hidden">{w.mobileNumber}</p>
                        </TableCell>
                        <TableCell className="hidden py-2.5 tabular-nums text-slate-700 lg:table-cell">{w.mobileNumber}</TableCell>
                        <TableCell className="py-2.5 whitespace-normal">{partnerStatusPill(w.status)}</TableCell>
                        <TableCell className="py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                          ₹{w.walletBalance.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-semibold tabular-nums text-amber-700">
                          ₹{w.pendingWalletBalance.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="pr-4 py-2.5 text-right">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:shadow-sm group-hover:ring-1 group-hover:ring-slate-200">
                            <ChevronRight size={15} />
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
      </FleetPanel>

      <Sheet open={!!selectedPartnerId} onOpenChange={(open) => !open && closeModal()}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 sm:max-w-xl">
          {isDetailLoading || !detail ? (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>Partner wallet</SheetTitle>
                <SheetDescription>Loading wallet</SheetDescription>
              </SheetHeader>
              <div className="flex justify-center py-12">
                <Loader size="lg" message="Loading wallet..." />
              </div>
            </>
          ) : (
            <>
              <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4">
                <SheetTitle className="text-[15px] font-semibold">{detail.fullName}</SheetTitle>
                <SheetDescription className="text-[12px]">{detail.mobileNumber} · {detail.email}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 p-5">
                {/* Balances */}
                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Available balance</p>
                    <p className="text-xl font-semibold tabular-nums text-emerald-700">₹{detail.walletBalance.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="border-l border-slate-100 px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500">Pending balance</p>
                    <p className="text-xl font-semibold tabular-nums text-amber-700">₹{detail.pendingWalletBalance.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Release */}
                <section className="rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <header className="border-b border-slate-100 px-4 py-2.5">
                    <h3 className="text-[12px] font-semibold text-slate-700">Release pending funds</h3>
                  </header>
                  <div className="flex flex-col gap-2 p-4 sm:flex-row">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Amount to release"
                      value={releaseAmount}
                      onChange={(e) => setReleaseAmount(e.target.value)}
                      disabled={isActing || detail.pendingWalletBalance <= 0}
                      className="h-8 text-[13px]"
                    />
                    <Button
                      variant="outline"
                      className="h-8 text-[12px]"
                      disabled={isActing || detail.pendingWalletBalance <= 0}
                      onClick={() => handleRelease(false)}
                    >
                      Release
                    </Button>
                    <Button
                      className="h-8 bg-slate-900 text-[12px] hover:bg-black"
                      disabled={isActing || detail.pendingWalletBalance <= 0}
                      onClick={() => handleRelease(true)}
                    >
                      Release all
                    </Button>
                  </div>
                </section>

                {/* Manual adjustment */}
                <section className="rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <header className="border-b border-slate-100 px-4 py-2.5">
                    <h3 className="text-[12px] font-semibold text-slate-700">Manual adjustment</h3>
                  </header>
                  <div className="space-y-2.5 p-4">
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      <div className="inline-flex shrink-0 rounded-md bg-slate-100 p-0.5">
                        <button
                          type="button"
                          onClick={() => setAdjustDirection("credit")}
                          disabled={isActing}
                          className={`h-7 rounded px-3 text-[12px] font-medium transition-colors ${adjustDirection === "credit" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Credit
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustDirection("debit")}
                          disabled={isActing}
                          className={`h-7 rounded px-3 text-[12px] font-medium transition-colors ${adjustDirection === "debit" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Debit
                        </button>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        className="h-8 min-w-[140px] flex-1 text-[13px]"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        disabled={isActing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="adjust-reason" className="sr-only">Reason</Label>
                      <Textarea
                        id="adjust-reason"
                        placeholder="Reason for this adjustment (required)"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        disabled={isActing}
                        className="min-h-16 text-[13px]"
                      />
                    </div>
                    <Button disabled={isActing} onClick={handleAdjust} className="h-8 w-full bg-[#FE5300] text-[12px] hover:bg-[#e54b00]">
                      Apply adjustment
                    </Button>
                  </div>
                </section>

                {/* Transactions */}
                <section className="rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <h3 className="text-[12px] font-semibold text-slate-700">Transaction history</h3>
                    <span className="rounded bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-600">{detail.transactions.length}</span>
                  </header>
                  {detail.transactions.length === 0 ? (
                    <p className="py-6 text-center text-[12px] text-slate-400">No transactions yet</p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                      {detail.transactions.map((tx) => (
                        <li key={tx._id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                              {TRANSACTION_LABEL[tx.type] || tx.type}
                            </p>
                            <p className="break-words text-[11px] text-slate-500">
                              {new Date(tx.createdAt).toLocaleString("en-IN")}
                              {tx.adminName ? ` · by ${tx.adminName}` : ""}
                              {tx.note ? ` · ${tx.note}` : ""}
                            </p>
                          </div>
                          <p
                            className={
                              tx.type === "admin_debit"
                                ? "shrink-0 text-[13px] font-semibold tabular-nums text-red-600"
                                : "shrink-0 text-[13px] font-semibold tabular-nums text-emerald-600"
                            }
                          >
                            {tx.type === "admin_debit" ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="flex justify-end">
                  <Button variant="outline" className="h-8 text-[12px]" onClick={closeModal}>Close</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </FleetPage>
  );
}

export default WalletsPage;
