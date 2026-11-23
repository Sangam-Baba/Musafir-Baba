"use client";
// Client wallet (Stage 11): what the company can spend (balance, held, credit), adding money by PayU or bank transfer,
// the statement and the low-balance alert. Owners and accountants see it (`wallet.account.read`).
import { useQuery } from "@tanstack/react-query";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { AddMoney, BalanceCards, BankTransfer, LowBalanceSetting, OnlineTopUps, Statement } from "@/b2b/components/wallet/WalletParts";
import { errorMessage } from "@/b2b/messages";
import type { Credit, Wallet } from "@/b2b/wallet";

function WalletView({ canTopUp }: { canTopUp: boolean }) {
  const wallet = useQuery({ queryKey: ["b2b", "wallet"], queryFn: () => b2b<Wallet>("/wallet") });
  const credit = useQuery({ queryKey: ["b2b", "credit"], queryFn: () => b2b<Credit>("/credit"), enabled: wallet.isSuccess });
  return (
    <div className="space-y-4">
      <PageHeader title="Your" highlight="wallet" subtitle="Money your company keeps with MusafirBaba for bookings. Usable only for MusafirBaba services." />
      {wallet.error && <p className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-700">{errorMessage(wallet.error)}</p>}
      {wallet.data && (
        <>
          <BalanceCards wallet={wallet.data} credit={credit.data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <AddMoney canTopUp={canTopUp} />
            <LowBalanceSetting wallet={wallet.data} canChange={canTopUp} />
          </div>
          <BankTransfer canTopUp={canTopUp} />
          <OnlineTopUps />
          <Statement />
        </>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("wallet.account.read") ? (
          <WalletView canTopUp={me.permissions.includes("wallet.account.topup")} />
        ) : (
          <p className="text-[13px] text-slate-600">Only your company&apos;s owner or accountant can see the wallet.</p>
        )
      }
    </BusinessShell>
  );
}
