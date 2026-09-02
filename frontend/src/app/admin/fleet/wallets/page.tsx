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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Partner Wallets</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Trip earnings land in a partner&apos;s pending balance first. Release pending funds to their
          available balance, or make a manual adjustment, from here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Available Balance</p>
            <p className="text-3xl font-bold text-emerald-600">₹{totals.available.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Pending Balance</p>
            <p className="text-3xl font-bold text-amber-600">₹{totals.pending.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>Click a partner to view transaction history and manage their wallet</CardDescription>
          <Input
            placeholder="Search by name or mobile number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 max-w-sm"
          />
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading wallets..." />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No partners found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="font-semibold">Partner</TableHead>
                    <TableHead className="font-semibold">Mobile</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Available Balance</TableHead>
                    <TableHead className="font-semibold text-right">Pending Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((w) => (
                    <TableRow
                      key={w.partnerId}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPartnerId(w.partnerId)}
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">{w.fullName}</TableCell>
                      <TableCell>{w.mobileNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{w.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        ₹{w.walletBalance.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-600">
                        ₹{w.pendingWalletBalance.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPartnerId} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {isDetailLoading || !detail ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading wallet..." />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{detail.fullName}</DialogTitle>
                <DialogDescription>{detail.mobileNumber} — {detail.email}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Available Balance</p>
                  <p className="text-2xl font-bold text-emerald-600">₹{detail.walletBalance.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Balance</p>
                  <p className="text-2xl font-bold text-amber-600">₹{detail.pendingWalletBalance.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Release Pending Funds</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount to release"
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(e.target.value)}
                    disabled={isActing || detail.pendingWalletBalance <= 0}
                  />
                  <Button
                    variant="outline"
                    disabled={isActing || detail.pendingWalletBalance <= 0}
                    onClick={() => handleRelease(false)}
                  >
                    Release
                  </Button>
                  <Button
                    disabled={isActing || detail.pendingWalletBalance <= 0}
                    onClick={() => handleRelease(true)}
                  >
                    Release All
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Manual Adjustment</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={adjustDirection === "credit" ? "default" : "outline"}
                    onClick={() => setAdjustDirection("credit")}
                    disabled={isActing}
                  >
                    Credit
                  </Button>
                  <Button
                    type="button"
                    variant={adjustDirection === "debit" ? "default" : "outline"}
                    onClick={() => setAdjustDirection("debit")}
                    disabled={isActing}
                  >
                    Debit
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount"
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
                  />
                </div>
                <Button disabled={isActing} onClick={handleAdjust} className="w-full">
                  Apply Adjustment
                </Button>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Transaction History</p>
                {detail.transactions.length === 0 ? (
                  <p className="text-sm text-slate-500">No transactions yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detail.transactions.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between text-sm border border-slate-100 dark:border-slate-800 rounded-md px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {TRANSACTION_LABEL[tx.type] || tx.type}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString("en-IN")}
                            {tx.adminName ? ` — by ${tx.adminName}` : ""}
                            {tx.note ? ` — ${tx.note}` : ""}
                          </p>
                        </div>
                        <p
                          className={
                            tx.type === "admin_debit"
                              ? "font-semibold text-red-600"
                              : "font-semibold text-emerald-600"
                          }
                        >
                          {tx.type === "admin_debit" ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={closeModal}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default WalletsPage;
